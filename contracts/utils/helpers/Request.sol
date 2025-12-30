// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import "../../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Request
 * @notice  Base contract providing EIP‑712 typed-data hashing support for request signatures.
 * @dev Inherits EIP712 implementation.
 * 
 * @custom:company Cosine Labs Inc.
 * @custom:contact engineering@getcosine.app
 * @custom:url https://getcosine.app
 * @notice Copyright (c) 2025 Cosine Labs Inc.
 * @custom:license MIT
 */
abstract contract Request is EIP712 {
    string private constant DOMAIN_NAME = "Handoff";
    string private constant DOMAIN_VERSION = "1";

    constructor() EIP712(DOMAIN_NAME, DOMAIN_VERSION) {}
}