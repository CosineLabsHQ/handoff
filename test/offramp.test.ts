import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { calculateNamespacedTxId, deployFixture } from './utils/helpers';
import { createEIP2616Signature, createEIP2616RequestSignature } from './utils/signing/eip2616';
import { createPermit2Signature, createPermit2RequestSignature } from './utils/signing/permit2';

describe('Offramp', function () {
  describe('Should offrampWithPermit and offrampWithPermit2', function () {
    it('offrampWithPermit', async function () {
      const { handoff, provider1, user1, token2, relayer1 } = await loadFixture(deployFixture);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const eip2616Signature = await createEIP2616Signature(user1, token2, handoff, amount, deadline);
      const eip2616RequestSignature = await createEIP2616RequestSignature(
        user1,
        handoff,
        token2,
        eip2616Signature,
        provider1,
        transactionId
      );
      const namespacedTransactionId = calculateNamespacedTxId(
        transactionId,
        user1.address,
        await handoff.getAddress(),
        (await ethers.provider.getNetwork()).chainId
      );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit(eip2616RequestSignature.eip712.message, eip2616RequestSignature.signature)
      )
        .to.emit(handoff, 'Completed')
        .withArgs(await token2.getAddress(), user1.address, provider1.address, amount, namespacedTransactionId);
    });

    it('offrampWithPermit2', async function () {
      const { handoff, provider1, user1, token1, relayer1, permit2 } = await loadFixture(deployFixture);
      await token1.connect(user1).approve(await permit2.getAddress(), ethers.MaxUint256);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const permit2Signature = await createPermit2Signature(user1, permit2, token1, handoff, amount, deadline);
      const permit2RequestSignature = await createPermit2RequestSignature(
        user1,
        handoff,
        token1,
        permit2Signature,
        provider1,
        transactionId
      );
      const namespacedTransactionId = calculateNamespacedTxId(
        transactionId,
        user1.address,
        await handoff.getAddress(),
        (await ethers.provider.getNetwork()).chainId
      );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit2(permit2RequestSignature.eip712.message, permit2RequestSignature.signature)
      )
        .to.emit(handoff, 'Completed')
        .withArgs(await token1.getAddress(), user1.address, provider1.address, amount, namespacedTransactionId);
    });
  });

  describe('Should offrampWithPermit and offrampWithPermit2 (invalid signature [causing revert])', async function () {
    it('offrampWithPermit', async function () {
      const { handoff, provider1, user1, token2, relayer1 } = await loadFixture(deployFixture);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const eip2616Signature = await createEIP2616Signature(user1, token2, handoff, amount, deadline, true); // mock fake signature
      const eip2616RequestSignature = await createEIP2616RequestSignature(
        user1,
        handoff,
        token2,
        eip2616Signature,
        provider1,
        transactionId
      );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit(eip2616RequestSignature.eip712.message, eip2616RequestSignature.signature)
      ).to.be.revertedWith('permit failed');
    });

    it('offrampWithPermit2', async function () {
      const { handoff, provider1, user1, token1, relayer1, permit2 } = await loadFixture(deployFixture);
      await token1.connect(user1).approve(await permit2.getAddress(), ethers.MaxUint256);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const permit2Signature = await createPermit2Signature(user1, permit2, token1, handoff, amount, deadline, true); // mock fake signature
      const permit2RequestSignature = await createPermit2RequestSignature(
        user1,
        handoff,
        token1,
        permit2Signature,
        provider1,
        transactionId
      );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit2(permit2RequestSignature.eip712.message, permit2RequestSignature.signature)
      ).to.be.revertedWith('permit2 failed');
    });
  });

  describe('Should offrampWithPermit and offrampWithPermit2 (handles frontrun by attacker and falls back to allowance to prevent DoS)', async function () {
    it('offrampWithPermit', async function () {
      const { handoff, provider1, user1, token2, relayer1, attacker } = await loadFixture(deployFixture);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const eip2616Signature = await createEIP2616Signature(user1, token2, handoff, amount, deadline);
      const eip2616RequestSignature = await createEIP2616RequestSignature(
        user1,
        handoff,
        token2,
        eip2616Signature,
        provider1,
        transactionId
      );
      const namespacedTransactionId = calculateNamespacedTxId(
        transactionId,
        user1.address,
        await handoff.getAddress(),
        (await ethers.provider.getNetwork()).chainId
      );
      const { owner, spender, value } = eip2616Signature.eip712.message;
      // attacker frontruns this transaction, either before it is broadcasted or while it is in the mempool.
      await token2
        .connect(attacker)
        .permit(
          owner,
          spender,
          value,
          deadline,
          eip2616Signature.signature.v,
          eip2616Signature.signature.r,
          eip2616Signature.signature.s
        );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit(eip2616RequestSignature.eip712.message, eip2616RequestSignature.signature)
      )
        .to.emit(handoff, 'Completed')
        .withArgs(await token2.getAddress(), user1.address, provider1.address, amount, namespacedTransactionId);
    });

    it('offrampWithPermit2', async function () {
      const { handoff, provider1, user1, token1, relayer1, permit2, attacker } = await loadFixture(deployFixture);
      await token1.connect(user1).approve(await permit2.getAddress(), ethers.MaxUint256);
      const transactionId = ethers.randomBytes(32);
      const amount = ethers.parseUnits('100', 18);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const permit2Signature = await createPermit2Signature(user1, permit2, token1, handoff, amount, deadline);
      const permit2RequestSignature = await createPermit2RequestSignature(
        user1,
        handoff,
        token1,
        permit2Signature,
        provider1,
        transactionId
      );
      const namespacedTransactionId = calculateNamespacedTxId(
        transactionId,
        user1.address,
        await handoff.getAddress(),
        (await ethers.provider.getNetwork()).chainId
      );
      // attacker frontruns this transaction, either before it is broadcasted or while it is in the mempool.
      await permit2
        .connect(attacker)
        ['permit(address,((address,uint160,uint48,uint48),address,uint256),bytes)'](
          user1.address,
          permit2RequestSignature.eip712.message.data.permit,
          permit2Signature.signature
        );
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit2(permit2RequestSignature.eip712.message, permit2RequestSignature.signature)
      )
        .to.emit(handoff, 'Completed')
        .withArgs(await token1.getAddress(), user1.address, provider1.address, amount, namespacedTransactionId);
    });
  });
});
