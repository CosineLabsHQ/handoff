// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/IHandoff.sol";
import "./Request.sol";

/**
 * @title EIP2612Request
 * @notice Provides EIP-712 signature verification for EIP-2612-based request.
 * @dev This contract abstracts out signature verification logic for a meta-transaction-style
 *      using the EIP-2612 permit standard (gasless approvals via off-chain signatures).
 * 
 * @custom:company Cosine Labs Inc.
 * @custom:contact engineering@getcosine.app
 * @custom:url https://getcosine.app
 * @notice Copyright (c) 2025 Cosine Labs Inc.
 * @custom:license MIT
 */
abstract contract EIP2612Request is Request  {
    using ECDSA for bytes32;

    /**
     * @notice The EIP712 type hash for the entire EIP2612Request structure.
     * @dev Matches the format required to recreate the off-chain signed message.
     */
    bytes32 private constant EIP2612REQUEST_TYPEHASH = keccak256(
        "EIP2612Request(EIP2612Permit data,address provider,bytes32 transactionId)"
        "EIP2612Permit(address token,address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)"
    );

    /**
     * @notice The EIP712 type hash for EIP2612Permit structure.
     * @dev Used to hash the permit data according to EIP-712 standard.
     */
    bytes32 private constant EIP2612PERMIT_TYPEHASH = keccak256(
        "EIP2612Permit(address token,address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)"
    );

    /**
     * @notice Recovers the signer address from an EIP2612 request.
     * @dev Creates the structured hash and recovers the signer address.
     * 
     * @param _request The EIP2612 request.
     * @param _signature The signature to verify the request.
     * @return recoveredSigner The address recovered from the signature.
     */
    function _recoverSignerFromEIP2612Request(
        IHandoff.EIP2612Request calldata _request,
        bytes calldata _signature
    ) internal view returns (address) {
        bytes32 structHash = keccak256(abi.encode(
            EIP2612REQUEST_TYPEHASH,
            _hashEIP2612Permit(_request.data),
            _request.provider,
            _request.transactionId
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(_signature);
        return recoveredSigner; 
    }

    /**
     * @notice Hashes an EIP2612Permit struct for EIP-712 compliance.
     * @param _permit The EIP2612 permit to hash.
     * @return The keccak256 hash of the permit.
     */
    function _hashEIP2612Permit(IHandoff.EIP2612Permit calldata _permit) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            EIP2612PERMIT_TYPEHASH,
            _permit.token,
            _permit.owner,
            _permit.spender,
            _permit.value,
            _permit.deadline,
            _permit.v,
            _permit.r,
            _permit.s
        ));
    }
}