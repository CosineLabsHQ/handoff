// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "../../../lib/permit2/src/interfaces/IPermit2.sol";
import "../interfaces/IHandoff.sol"; 
import "./Request.sol";

/**
 * @title Permit2Request
 * @notice Provides EIP-712 signature verification for Permit2-based request.
 * @dev This contract abstracts out signature verification logic for a meta-transaction-style
 *      using the Permit2 permit standard (gasless approvals via off-chain signatures).
 * 
 * @custom:company Cosine Labs Inc.
 * @custom:contact engineering@getcosine.app
 * @custom:url https://getcosine.app
 * @notice Copyright (c) 2025 Cosine Labs Inc.
 * @custom:license MIT
 */
abstract contract Permit2Request is Request  {
    using ECDSA for bytes32;

    /**
     * @notice The EIP712 type hash for the entire Permit2Request structure.
     * @dev Matches the format required to recreate the off-chain signed message.
     */ 
    bytes32 private constant PERMIT2REQUEST_TYPEHASH = keccak256(
        "Permit2Request(Permit2 data,address provider,bytes32 transactionId)"
        "Permit2(address owner,PermitSingle permit,bytes signature)"
        "PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
        "PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)"
    );

    /**
     * @notice The EIP712 type hash for Permit2 structure.
     * @dev Used to hash the Permit2 wrapper data according to EIP-712 standard.
     */
    bytes32 private constant PERMIT2_TYPEHASH = keccak256(
        "Permit2(address owner,PermitSingle permit,bytes signature)"
        "PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
        "PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)"
    );

    /**
     * @notice The EIP712 type hash for PermitSingle structure.
     * @dev Used to hash the permit single data according to EIP-712 standard.
     */
    bytes32 private constant PERMITSINGLE_TYPEHASH = keccak256(
        "PermitSingle(PermitDetails details,address spender,uint256 sigDeadline)"
        "PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
    );

    /**
     * @notice The EIP712 type hash for PermitDetails structure.
     * @dev Used to hash the permit details according to EIP-712 standard.
     */
    bytes32 private constant PERMITDETAILS_TYPEHASH = keccak256(
        "PermitDetails(address token,uint160 amount,uint48 expiration,uint48 nonce)"
    );

    /**
     * @notice Recovers the signer address from a Permit2 request.
     * @dev Creates the structured hash and recovers the signer address.
     * 
     * @param _request The Permit2 request.
     * @param _signature The signature to verify the request.
     * @return recoveredSigner The address recovered from the signature.
     */
    function _recoverSignerFromPermit2Request(
        IHandoff.Permit2Request calldata _request,
        bytes calldata _signature
    ) internal view returns (address) {
        bytes32 structHash = keccak256(abi.encode(
            PERMIT2REQUEST_TYPEHASH,
            _hashPermit2(_request.data),
            _request.provider,
            _request.transactionId
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredSigner = hash.recover(_signature);
        return recoveredSigner; 
    }

    /**
     * @notice Hashes a Permit2 struct for EIP-712 compliance.
     * @param _permit The Permit2 data to hash.
     * @return The keccak256 hash of the Permit2 data.
     */
    function _hashPermit2(IHandoff.Permit2 calldata _permit) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            PERMIT2_TYPEHASH,
            _permit.owner,
            _hashPermitSingle(_permit.permit),
            keccak256(_permit.signature)
        ));
    }

    /**
     * @notice Hashes a PermitSingle struct for EIP-712 compliance.
     * @param _permitSingle The PermitSingle data to hash.
     * @return The keccak256 hash of the PermitSingle data.
     */
    function _hashPermitSingle(IPermit2.PermitSingle calldata _permitSingle) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            PERMITSINGLE_TYPEHASH,
            _hashPermitDetails(_permitSingle.details),
            _permitSingle.spender,
            _permitSingle.sigDeadline
        ));
    }

    /**
     * @notice Hashes a PermitDetails struct for EIP-712 compliance.
     * @param _details The PermitDetails data to hash.
     * @return The keccak256 hash of the PermitDetails data.
     */
    function _hashPermitDetails(IPermit2.PermitDetails calldata _details) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            PERMITDETAILS_TYPEHASH,
            _details.token,
            _details.amount,
            _details.expiration,
            _details.nonce
        ));
    }
}