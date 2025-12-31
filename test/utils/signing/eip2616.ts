import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { MockERC20Permit, MockERC20PermitWithFee, Handoff } from '../../../typechain-types';

/**
 * Creates a valid EIP-2612 permit object and signature.
 *
 * @param owner
 * @param token
 * @param spender
 * @param value
 * @param deadline
 * @returns
 */
export const createEIP2616Signature = async (
  owner: HardhatEthersSigner,
  token: MockERC20Permit | MockERC20PermitWithFee,
  spender: Handoff,
  value: bigint,
  deadline: number,
  mockSignature = false
) => {
  const eip712 = {
    primaryType: 'Permit',
    domain: {
      name: await token.name(),
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await token.getAddress()
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    },
    message: {
      owner: owner.address,
      spender: await spender.getAddress(),
      value: value,
      nonce: await token.nonces(owner.address),
      deadline: deadline
    }
  };
  const signature = await owner.signTypedData(eip712.domain, eip712.types, eip712.message);
  const parsedSignature = ethers.Signature.from(signature);
  const mockedSignature = {
    v: 27,
    r: ethers.hexlify(ethers.randomBytes(32)),
    s: ethers.hexlify(ethers.randomBytes(32))
  };
  return {
    eip712,
    signer: owner.address,
    signature: mockSignature ? mockedSignature : { v: parsedSignature.v, r: parsedSignature.r, s: parsedSignature.s }
  };
};

/**
 * Creates a valid EIP-2612 offramp request object and signature.
 *
 * @param requestSigner
 * @param handoff
 * @param token
 * @param eip2616Signature
 * @param provider
 * @returns
 */
export const createEIP2616RequestSignature = async (
  owner: HardhatEthersSigner,
  handoff: Handoff,
  token: MockERC20Permit | MockERC20PermitWithFee,
  eip2616Signature: {
    eip712: any;
    signer: string;
    signature: {
      v: number;
      r: Uint8Array<ArrayBufferLike> | string;
      s: Uint8Array<ArrayBufferLike> | string;
    };
  },
  provider: HardhatEthersSigner,
  transactionId: Uint8Array
) => {
  const eip712 = {
    primaryType: 'EIP2612Request',
    domain: {
      name: 'Handoff',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await handoff.getAddress()
    },
    types: {
      EIP2612Request: [
        { name: 'data', type: 'EIP2612Permit' },
        { name: 'provider', type: 'address' },
        { name: 'transactionId', type: 'bytes32' }
      ],
      EIP2612Permit: [
        { name: 'token', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'v', type: 'uint8' },
        { name: 'r', type: 'bytes32' },
        { name: 's', type: 'bytes32' }
      ]
    },
    message: {
      data: {
        token: await token.getAddress(),
        owner: owner.address,
        spender: eip2616Signature.eip712.message.spender,
        value: eip2616Signature.eip712.message.value,
        deadline: eip2616Signature.eip712.message.deadline,
        v: eip2616Signature.signature.v,
        r: eip2616Signature.signature.r,
        s: eip2616Signature.signature.s
      },
      provider: provider.address,
      transactionId: transactionId
    }
  };
  const signature = await owner.signTypedData(eip712.domain, eip712.types, eip712.message);
  return { eip712, signature: signature };
};
