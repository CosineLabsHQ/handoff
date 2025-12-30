// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Pausable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "../lib/permit2/src/interfaces/IPermit2.sol";
import "./utils/helpers/Request.sol";
import "./utils/helpers/EIP2612Request.sol";
import "./utils/helpers/Permit2Request.sol";
import "./utils/interfaces/IHandoff.sol";

/**
 * @title Handoff
 * @notice Handoff is a gasless offramp protocol that enables users to sell tokens without paying gas fees, powered by EIP-2612 and Permit2 standards without requiring prior on-chain approvals.
 * @dev Inherits from Ownable for access control, Pausable for emergency stops, ReentrancyGuard to prevent reentrant calls, and EIP712/{ECDSA-recover} for request verification.
 * 
 * @custom:company Cosine Labs Inc.
 * @custom:contact engineering@getcosine.app
 * @custom:url https://getcosine.app
 * @custom:copyright Copyright (c) 2025 Cosine Labs Inc.
 * @custom:license MIT
 */
contract Handoff is Ownable, Pausable, ReentrancyGuard, Request, EIP2612Request, Permit2Request {
    address[] public relayers;
    IPermit2 public immutable permit2;
  
    mapping(address => bool) public relayerRegistry;
    mapping(address => bool) public blacklistRegistry;
    mapping(address => mapping(bytes32 => IHandoff.OfframpTransaction)) public transactionRegistry;
    mapping(address => uint256) public volumeRegistry;

    /**
     * @notice Deploys the Handoff contract and sets the initial configuration.
     * @dev Initializes relayers, Permit2, and contract owner.
     *
     * @param _relayers The addresses authorized to relay offramp transactions.
     * @param _permit2 The address of the Permit2 contract.
     * @param _owner The owner of the contract (multi-sig wallet).
     */
    constructor(
        address[] memory _relayers,
        address _permit2,
        address _owner
    ) Ownable(_owner) Request() {
        for (uint256 i = 0; i < _relayers.length; i++) {
            _addRelayer(_relayers[i]);
        }
        permit2 = IPermit2(_permit2);
    }

    /**
     * @notice Restricts function access to authorized relayer addresses only.
     * @dev Reverts if the caller is not in the relayer registry.
     */
    modifier onlyRelayer() {
        require(relayerRegistry[_msgSender()], "not relayer");
        _;
    }
    
    /**
     * @notice Executes a token transfer to an offramp provider using EIP-2612 permit-based authorization.
     * @dev Verifies the signature, checks blacklist status, processes the permit, and executes the transfer.
     *      Emits a Completed event upon successful execution.
     * 
     * @param _request The EIP2612 payment request containing permit data and transaction details.
     * @param _signature The signature from the relayer authorizing this request.
     */
    function offrampWithPermit(
        IHandoff.EIP2612Request calldata _request,
        bytes calldata _signature
    ) external whenNotPaused nonReentrant onlyRelayer {
        require(!blacklistRegistry[_request.data.owner], "user is blacklisted");
        require(!blacklistRegistry[_request.provider], "provider is blacklisted");
        require(_recoverSignerFromEIP2612Request(_request, _signature) == _request.data.owner, "invalid signature");
        require(_request.data.token != address(0), "token cannot be zero address");
        require(_request.provider != address(0), "provider cannot be zero address");
        require(_request.data.value > 0, "amount must be greater than zero");
        require(_request.data.spender == address(this), "spender must equals to this contract");
        require(_request.data.owner != _request.provider, "signer cannot be an offramp provider");
        bytes32 transactionId = _namespaceTx(_request.transactionId, _request.data.owner);
        require(!transactionRegistry[_request.data.owner][transactionId].exists, "transaction already exists");
        _safePermit(_request.data.token, _request.data.owner, _request.data.spender, _request.data.value, _request.data.deadline, _request.data.v, _request.data.r, _request.data.s);
        _safeTransferFrom(_request.data.token, _request.data.owner, _request.provider, _request.data.value);
        transactionRegistry[_request.data.owner][transactionId] = IHandoff.OfframpTransaction(transactionId, _request.data.owner, _request.provider, _request.data.token, _request.data.value, true);
        volumeRegistry[_request.data.token] += _request.data.value;
        emit IHandoff.Completed(_request.data.owner, _request.provider, _request.data.token, _request.data.value, transactionId);
    }

    /**
     * @notice Executes a token transfer to an offramp provider using Uniswap's Permit2 permit-based authorization.
     * @dev Verifies the signature, checks blacklist status, processes the Permit2 permit, and executes the transfer.
     *      Emits a Completed event upon successful execution.
     * 
     * @param _request The Permit2 payment request containing permit data and transaction details.
     * @param _signature The signature from the relayer authorizing this request.
     */
    function offrampWithPermit2(
        IHandoff.Permit2Request calldata _request,
        bytes calldata _signature
    ) external whenNotPaused nonReentrant onlyRelayer {
        require(!blacklistRegistry[_request.data.owner], "user is blacklisted");
        require(!blacklistRegistry[_request.provider], "provider is blacklisted");
        require(_recoverSignerFromPermit2Request(_request, _signature) == _request.data.owner, "invalid signature");
        require(_request.data.permit.details.token != address(0), "token cannot be zero address");
        require(_request.provider != address(0), "provider cannot be zero address");
        require(_request.data.permit.details.amount > 0, "amount must be greater than zero");
        require(_request.data.permit.spender == address(this), "spender must equals to this contract");
        require(_request.data.owner != _request.provider, "signer cannot be an offramp provider");
        bytes32 transactionId = _namespaceTx(_request.transactionId, _request.data.owner);
        require(!transactionRegistry[_request.data.owner][transactionId].exists, "transaction already exists");
        _safePermit2(_request.data.owner, _request.data.permit, _request.data.signature);
        permit2.transferFrom(_request.data.owner, _request.provider, _request.data.permit.details.amount, _request.data.permit.details.token);
        transactionRegistry[_request.data.owner][transactionId] = IHandoff.OfframpTransaction(transactionId, _request.data.owner, _request.provider, _request.data.permit.details.token, _request.data.permit.details.amount, true);
        volumeRegistry[_request.data.permit.details.token] += _request.data.permit.details.amount;
        emit IHandoff.Completed(_request.data.owner, _request.provider, _request.data.permit.details.token, _request.data.permit.details.amount, transactionId);
    }
  
    /**
     * @notice Transfers native currency (e.g., ETH, POL, BNB, AVAX) held by this contract to a specified recipient.
     * @dev Only callable by the contract owner. Uses a low-level call to forward all available gas. 
     *      Reverts if the transfer fails.
     *
     * @param _recipient The address to receive the native currency.
     * @param _amount The amount to transfer, denominated in wei.
     */
    function transferNative(
        address _recipient,
        uint256 _amount
    ) external nonReentrant onlyOwner {
        require(_recipient != address(0), "recipient cannot be zero address");
        require(_amount > 0, "amount must be greater than zero");
        require(address(this).balance >= _amount, "insufficient native balance");
        _safeNativeTransfer(_recipient, _amount);
        emit IHandoff.NativeTransferred(_recipient, _amount);
    }

    /**
     * @notice Transfers ERC20 tokens held by this contract to a specified recipient.
     * @dev Only callable by the contract owner. Includes checks for zero address, zero amount, 
     *      and sufficient balance before executing the transfer.
     * 
     * @param _token The address of the ERC20 token to transfer.
     * @param _recipient The address to receive the tokens.
     * @param _amount The amount of tokens to transfer (in the token's smallest unit).
     */
    function transferToken(
        address _token,
        address _recipient,
        uint256 _amount
    ) external nonReentrant onlyOwner {
        require(_token != address(0), "token cannot be zero address");
        require(_recipient != address(0), "recipient cannot be zero address");
        require(_amount > 0, "amount must be greater than zero");
        require(IERC20(_token).balanceOf(address(this)) >= _amount, "insufficient token balance");
        _safeTransfer(_token, _recipient, _amount);
        emit IHandoff.TokenTransferred(_recipient, _token, _amount);
    }

    /**
     * @notice Retrieves the list of authorized relayers.
     * @dev Returns the array of relayer addresses currently authorized in this contract.
     * 
     * @return An array of addresses representing the authorized relayers.
     */
    function getRelayers() external view returns (address[] memory) {
        return relayers;
    }

    /**
     * @notice Pauses all contract operations that modify state.
     * @dev Only callable by the contract owner. Useful for emergency situations or maintenance.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes contract operations after being paused.
     * @dev Only callable by the contract owner. Re-enables all pausable functions.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Adds a new relayer to the authorized relayers list.
     * @dev Only callable by the contract owner. Internally calls `_addRelayer`.
     *
     * @param _relayer The address to authorize as a relayer.
     */
    function addRelayer(address _relayer) external onlyOwner {
        _addRelayer(_relayer);
    }

    /**
     * @notice Removes a relayer from the authorized relayers list.
     * @dev Only callable by the contract owner. Emits a `RelayerRemoved` event.
     *      Reverts if the relayer does not exist in the registry.
     *
     * @param _relayer The address of the relayer to remove.
     */
    function removeRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "relayer cannot be address zero");
        require(relayerRegistry[_relayer], "relayer not exists");
        relayerRegistry[_relayer] = false;
        for (uint256 i = 0; i < relayers.length; i++) {
            if (relayers[i] == _relayer) {
                relayers[i] = relayers[relayers.length - 1];
                relayers.pop();
                emit IHandoff.RelayerRemoved(_relayer);
                break;
            }
        }
    }

    /**
     * @notice Adds multiple addresses to the blacklist, preventing them from initiating offramp transactions.
     * @dev Only callable by the contract owner. Emits a `Blacklisted` event for each newly blacklisted address.
     *      Skips addresses that are already blacklisted.
     *
     * @param _users An array of addresses to blacklist.
     */
    function blacklist(address[] calldata _users) external onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            require(user != address(0), "user cannot be address zero");
            if (!blacklistRegistry[user]) {
                blacklistRegistry[user] = true;
                emit IHandoff.Blacklisted(user);
            }
        }
    }

    /**
     * @notice Removes an address from the blacklist, restoring its ability to initiate offramp transactions.
     * @dev Only callable by the contract owner. Emits an `UnBlacklisted` event.
     *
     * @param _user The address to remove from the blacklist.
     */
    function unBlacklist(address _user) external onlyOwner {
        require(_user != address(0), "user cannot be address zero");
        blacklistRegistry[_user] = false;
        emit IHandoff.UnBlacklisted(_user);
    }

    /**
     * @notice Allows the contract to receive native currency.
     * @dev Emits a NativeReceived event when native currency is deposited.
     */
    receive() external payable {
        emit IHandoff.NativeReceived(msg.sender, msg.value);
    }

    /**
     * @notice Internal helper function to add a relayer to the authorized relayers list.
     * @dev Reverts if the relayer address is zero or already exists in the registry. 
     *      Emits a `RelayerAdded` event upon successful addition.
     *
     * @param _relayer The address to authorize as a relayer.
     */
    function _addRelayer(address _relayer) internal {
        require(_relayer != address(0), "relayer cannot be address zero");
        require(!relayerRegistry[_relayer], "relayer already added");
        relayerRegistry[_relayer] = true;
        relayers.push(_relayer);
        emit IHandoff.RelayerAdded(_relayer);
    }

    /**
     * @notice Generates a namespaced transaction ID unique to the signer, contract, and blockchain.
     * @dev Hashes the original `_transactionId` together with the signer address, contract address,
     *      and chain ID to prevent replay attacks across different chains or contracts.
     *
     * @param _transactionId The original transaction ID (e.g., off-chain or external identifier).
     * @param _signer The address that authorized this transaction.
     * @return A namespaced `bytes32` hash scoped to this signer, contract, and chain.
     */
    function _namespaceTx(bytes32 _transactionId, address _signer) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_transactionId, _signer, address(this), block.chainid));
    }

    /**
     * @notice Safely attempts to perform an ERC20 permit operation with front-running protection.
     * @dev First attempts to call `permit()` to set the allowance via signature.
     *      If it fails (e.g., due to front-running or already executed permit), checks if the 
     *      allowance is already sufficient. Reverts only if both the permit call and allowance check fail.
     *      See TrustlessPermit: https://github.com/trust1995/trustlessPermit
     *      See Note: https://www.trust-security.xyz/post/permission-denied
     * 
     * @param token The ERC20 token contract implementing the permit function.
     * @param owner The address granting the allowance.
     * @param spender The address receiving the allowance.
     * @param value The amount to approve.
     * @param deadline The expiration timestamp for the permit signature.
     * @param v The recovery byte of the signature.
     * @param r The first 32 bytes of the signature.
     * @param s The second 32 bytes of the signature.
     */
    function _safePermit(
        address token,
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        // try permit before allowance check to advance nonce if possible
        try IERC20Permit(token).permit(owner, spender, value, deadline, v, r, s) {
            return;
        } catch {
            // permit potentially got front-run. Continue if allowance is sufficient.
            if (IERC20(token).allowance(owner, spender) >= value) {
                return;
            }
        }
        revert("permit failed");
    }

    /**
     * @notice Safely attempts to perform a Permit2 signature-based approval with front-running protection.
     * @dev First attempts to call `permit2.permit()` to set the allowance via signature.
     *      If it fails (e.g., due to front-running or already executed permit), checks if the 
     *      allowance is already sufficient. Reverts only if both the permit call and allowance check fail.
     *      See OpenZeppelin Audit Note: https://blog.openzeppelin.com/uniswap-v4-periphery-and-universal-router-audit#permit2-signatures-could-be-front-run-to-temporarily-prevent-execution
     * 
     * @param owner The address granting the allowance.
     * @param permitData The Permit2 permit structure containing token, spender, amount, expiration, and nonce.
     * @param signature The Permit2 signature from the owner.
     */
    function _safePermit2(
        address owner,
        IPermit2.PermitSingle calldata permitData,
        bytes calldata signature
    ) internal {
        // try permit2 before allowance check to advance nonce if possible
        try permit2.permit(owner, permitData, signature) {
            return;
        } catch {
            // permit2 potentially got front-run. Continue if allowance is sufficient.
            (uint160 amount,,) = permit2.allowance(owner, permitData.details.token, permitData.spender);
            if (amount >= permitData.details.amount) {
                return;
            }
        }
        revert("permit2 failed");
    }

    /**
     * @notice Safely transfers native currency (e.g., ETH, POL, BNB, AVAX) using a low-level call.
     * @dev Performs a raw `call` with value to forward all available gas. Reverts if the call fails.
     *      See Solmate's SafeTransferLib: https://github.com/transmissions11/solmate/blob/89365b880c4f3c786bdd453d4b8e8fe410344a69/src/utils/SafeTransferLib.sol#L14
     *
     * @param to The recipient of the native currency.
     * @param amount The amount of native currency to transfer, denominated in wei.
     */
    function _safeNativeTransfer(address to, uint256 amount) internal {
        bool success;
        assembly ("memory-safe") {
            // transfer the native currency and store if it succeeded or not
            success := call(gas(), to, amount, 0, 0, 0, 0)
        }
        require(success, "native: transfer failed");
    }

    /**
     * @notice Safely performs an ERC-20 `transfer` call using low-level assembly.
     * @dev Handles ERC-20 tokens that do not return a boolean or return no data at all.
     *      Constructs the calldata manually and uses a low-level `call` for gas efficiency.
     *      This method ensures compatibility with a wide range of ERC-20 tokens, including 
     *      non-standard ones like USDT, which do not return any data on success.
     *      See Solmate's SafeTransferLib: https://github.com/transmissions11/solmate/blob/89365b880c4f3c786bdd453d4b8e8fe410344a69/src/utils/SafeTransferLib.sol#L63
     * 
     * @param _token The address of the ERC-20 token to transfer.
     * @param _to The recipient of the tokens.
     * @param _amount The amount of tokens to transfer.
     */
    function _safeTransfer(
        address _token,
        address _to,
        uint256 _amount
    ) internal {
        bool success;
        assembly ("memory-safe") {
            // get a pointer to some free memory
            let freeMemoryPointer := mload(0x40)
            // write the abi-encoded calldata into memory, beginning with the function selector
            mstore(freeMemoryPointer, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), and(_to, 0xffffffffffffffffffffffffffffffffffffffff)) // append and mask the "to" argument
            mstore(add(freeMemoryPointer, 36), _amount) // append the "amount" argument. masking not required as it's a full 32 byte type
            // we use 68 because the length of our calldata totals up like so: 4 + 32 * 2
            // we use 0 and 32 to copy up to 32 bytes of return data into the scratch space
            success := call(gas(), _token, 0, freeMemoryPointer, 68, 0, 32)
            // set success to whether the call reverted, if not we check it either
            // returned exactly 1 (can't just be non-zero data), or had no return data and token has code
            if and(iszero(and(eq(mload(0), 1), gt(returndatasize(), 31))), success) {
                success := iszero(or(iszero(extcodesize(_token)), returndatasize())) 
            }
        }
        require(success, "token: transfer failed");
    }

    /**
     * @notice Safely performs an ERC-20 `transferFrom` call using low-level assembly.
     * @dev Handles ERC-20 tokens that do not return a boolean or return no data at all.
     *      Constructs the calldata manually and uses a low-level `call` for gas efficiency.
     *      This method ensures compatibility with a wide range of ERC-20 tokens, including 
     *      non-standard ones like USDT, which do not return any data on success.
     *      See Solmate's SafeTransferLib: https://github.com/transmissions11/solmate/blob/89365b880c4f3c786bdd453d4b8e8fe410344a69/src/utils/SafeTransferLib.sol#L30
     * 
     * @param _token The address of the ERC-20 token to transfer.
     * @param _from The address to transfer tokens from.
     * @param _to The recipient of the tokens.
     * @param _amount The amount of tokens to transfer.
     */
    function _safeTransferFrom(
        address _token,
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        bool success;
        assembly ("memory-safe") {
            // get a pointer to some free memory
            let freeMemoryPointer := mload(0x40)
            // write the abi-encoded calldata into memory, beginning with the function selector
            mstore(freeMemoryPointer, 0x23b872dd00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), and(_from, 0xffffffffffffffffffffffffffffffffffffffff)) // append and mask the "from" argument
            mstore(add(freeMemoryPointer, 36), and(_to, 0xffffffffffffffffffffffffffffffffffffffff)) // append and mask the "to" argument
            mstore(add(freeMemoryPointer, 68), _amount) // append the "amount" argument. masking not required as it's a full 32 byte type
            // we use 100 because the length of our calldata totals up like so: 4 + 32 * 3
            // we use 0 and 32 to copy up to 32 bytes of return data into the scratch space
            success := call(gas(), _token, 0, freeMemoryPointer, 100, 0, 32)
            // set success to whether the call reverted, if not we check it either
            // returned exactly 1 (cannot just be non-zero data), or had no return data and token has code
            if and(iszero(and(eq(mload(0), 1), gt(returndatasize(), 31))), success) {
                success := iszero(or(iszero(extcodesize(_token)), returndatasize())) 
            }
        }
        require(success, "token: transfer from failed");
    }
}