# Handoff

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build](https://raw.githubusercontent.com/CosineLabsHQ/handoff/build-badge/badges/build.svg)](https://github.com/CosineLabsHQ/handoff/actions)
[![Test Coverage](https://raw.githubusercontent.com/CosineLabsHQ/handoff/coverage-badge/badges/coverage.svg)](https://github.com/CosineLabsHQ/handoff/actions)
[![CI Status](https://raw.githubusercontent.com/CosineLabsHQ/handoff/ci-badge/badges/ci.svg)](https://github.com/CosineLabsHQ/handoff/actions)

Handoff is a gasless offramp protocol that enables users to sell tokens without paying gas fees, powered by EIP-2612 and Permit2 standards.

## Overview

Handoff allows users to transfer ERC-20 tokens to offramp providers without prior on-chain approvals or gas costs. Users sign permit messages off-chain, and authorized relayers submit transactions on their behalf.

## Architecture

```
User → Signs EIP-2612/Permit2 (off-chain)
     → Signs Request (off-chain)
        → Relayer → Submits to Handoff contract
            → Validates signatures
            → Executes permit
            → Transfers tokens to provider
```

## Key Features

- **Gasless Transactions**: Users don't pay gas fees
- **Dual Permit Standards**: Supports both EIP-2612 and Uniswap Permit2
- **Signature-based Authorization**: Off-chain permits with on-chain execution
- **Replay Protection**: Namespaced transaction IDs prevent cross-chain/contract replays
- **Access Control**: Owner-managed relayers and blacklist
- **Emergency Controls**: Pausable operations for security incidents

## Function Reference

### User Operations (Relayer Only)

**`offrampWithPermit()`** - Executes token transfer using EIP-2612 permit

**`offrampWithPermit2()`** - Executes token transfer using Permit2

### Admin Operations (Owner Only)

**Access Control**

- `addRelayer()` / `removeRelayer()` - Manage authorized relayers
- `blacklist()` / `unBlacklist()` - Block/unblock addresses
- `pause()` / `unpause()` - Emergency stop mechanism

**Fund Management**

- `transferNative()` - Withdraw native currency (ETH/POL/etc)
- `transferToken()` - Withdraw ERC-20 tokens

## Deployment

```solidity
constructor(
    address[] memory _relayers,  // Initial relayer addresses
    address _permit2,            // Permit2 contract address
    address _owner               // Contract owner (multi-sig recommended)
)
```

## License

MIT License - Copyright (c) 2025 Cosine Labs Inc.

## Contact

- **Company**: Cosine Labs Inc.
- **Email**: engineering@getcosine.app
- **Website**: https://getcosine.app
