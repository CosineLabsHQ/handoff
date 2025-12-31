import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { MockERC20, MockERC20WithFee, MockPermit2, Handoff } from '../../../typechain-types';

/**
 * Creates a valid Uniswap's Permit2 permit object and signature.
 *
 * @param owner
 * @param token
 * @param spender
 * @param amount
 * @param deadline
 * @returns
 */
export const createPermit2Signature = async (
  owner: HardhatEthersSigner,
  permit2: MockPermit2,
  token: MockERC20 | MockERC20WithFee,
  spender: Handoff,
  amount: bigint,
  deadline: number,
  mockSignature = false
) => {
  const [, , nonce] = await permit2.allowance(owner.address, await token.getAddress(), await spender.getAddress());
  const eip712 = {
    primaryType: 'PermitSingle',
    domain: {
      name: 'Permit2',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await permit2.getAddress()
    },
    types: {
      PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' }
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
      ]
    },
    message: {
      details: {
        token: await token.getAddress(),
        amount: amount,
        expiration: deadline,
        nonce: nonce
      },
      spender: await spender.getAddress(),
      sigDeadline: deadline
    }
  };
  const signature = await owner.signTypedData(eip712.domain, eip712.types, eip712.message);
  const mockedSignature = ethers.hexlify(ethers.randomBytes(32));
  return { eip712, signer: owner.address, signature: mockSignature ? mockedSignature : signature };
};

/**
 * Creates a valid Uniswap's Permit2 permit request object and signature.
 *
 * @param owner
 * @param handoff
 * @param token
 * @param Permit2Signature
 * @param provider
 * @returns
 */
export const createPermit2RequestSignature = async (
  owner: HardhatEthersSigner,
  handoff: Handoff,
  token: MockERC20 | MockERC20WithFee,
  permit2Signature: { eip712: any; signer: string; signature: Uint8Array<ArrayBufferLike> | string },
  provider: HardhatEthersSigner,
  transactionId: Uint8Array
) => {
  const eip712 = {
    primaryType: 'Permit2Request',
    domain: {
      name: 'Handoff',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await handoff.getAddress()
    },
    types: {
      Permit2Request: [
        { name: 'data', type: 'Permit2' },
        { name: 'provider', type: 'address' },
        { name: 'transactionId', type: 'bytes32' }
      ],
      Permit2: [
        { name: 'owner', type: 'address' },
        { name: 'permit', type: 'PermitSingle' },
        { name: 'signature', type: 'bytes' }
      ],
      PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' }
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' }
      ]
    },
    message: {
      data: {
        owner: owner.address,
        permit: {
          details: {
            token: await token.getAddress(),
            amount: permit2Signature.eip712.message.details.amount,
            expiration: permit2Signature.eip712.message.details.expiration,
            nonce: permit2Signature.eip712.message.details.nonce
          },
          spender: permit2Signature.eip712.message.spender,
          sigDeadline: permit2Signature.eip712.message.sigDeadline
        },
        signature: permit2Signature.signature
      },
      provider: provider.address,
      transactionId: transactionId
    }
  };
  const signature = await owner.signTypedData(eip712.domain, eip712.types, eip712.message);
  return { eip712, signature: signature };
};
