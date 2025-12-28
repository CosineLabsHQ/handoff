// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../../lib/permit2/src/interfaces/IPermit2.sol";

interface IHandoff {
    /// @notice Emits an event when transaction has been completed.
    event Completed(address indexed user, address indexed provider, address indexed token, uint256 receivedAmount, bytes32 transactionId);
    /// @notice Emits an event when native or native transfer has been received or transfered.
    event NativeReceived(address indexed sender, uint256 amount);
    event NativeTransferred(address indexed recipient, uint256 receivedAmount);
    event TokenTransferred(address indexed recipient, address indexed token, uint256 receivedAmount);

    /// @notice Emits an event when user is blacklisted or unblacklisted.
    event Blacklisted(address indexed user);
    event UnBlacklisted(address indexed user);

    /// @notice Emits an event when relayer added or removed.
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    /**
     * @notice Records a offramp transaction.
     * 
     * @param id Unique, namespaced transaction identifier.
     * @param user Address that initiated the offramp transaction.
     * @param provider The offramp provider address. 
     * @param token ERC20 token used in the offramp transaction.
     * @param requestedAmount Amount that was requested.
     * @param receivedAmount Actual amount received (after fees, rebase or deflate).
     * @param exists Tracks if the offramp transaction exists to prevent duplicates.
     */
    struct OfframpTransaction {
        bytes32 id;
        address user;
        address provider;
        address token;
        uint256 requestedAmount;
        uint256 receivedAmount;
        bool exists;
    }

    /**
     * @notice The EIP-2612's permit() operation.
     * 
     * @param token The ERC20 token address.
     * @param owner The ERC20 token owner.
     * @param spender The address that is being approved to spend.
     * @param value The amount approved to spend.
     * @param deadline The expiration timestamp of the permit.
     * @param v The 'v' component of the signature.
     * @param r The 'r' component of the signature.
     * @param s The 's' component of the signature.
     */
    struct EIP2612Permit {
        address token;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v; 
        bytes32 r; 
        bytes32 s; 
    }

    /**
     * @notice The Uniswap's Permit2 permit() operation.
     *
     * @param owner The ERC20 token owner. 
     * @param permit The permit2 message signed for a single token allowance.
     * @param signature The Permit2 signature. 
     */
    struct Permit2 {
        address owner;
        IPermit2.PermitSingle permit;
        bytes signature;
    }

    /**
     * @notice The EIP2612 payment request.
     * 
     * @param permit The permit data signed by the token holder.
     * @param provider The offramp provider address.
     * @param transactionId The unique off-chain transaction identifier.
     */
    struct EIP2612Request {
        IHandoff.EIP2612Permit data;
        address provider;
        bytes32 transactionId;
    }

    /**
     * @notice The Permit2 payment request.
     *
     * @param permit The Permit2 data signed by the token holder.
     * @param provider The offramp provider address.
     * @param transactionId The unique off-chain transaction identifier.
     */
    struct Permit2Request {
        IHandoff.Permit2 data;
        address provider;
        bytes32 transactionId;
    }
}