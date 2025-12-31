import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';
import { createEIP2616Signature, createEIP2616RequestSignature } from './utils/signing/eip2616';
import { createPermit2Signature, createPermit2RequestSignature } from './utils/signing/permit2';

describe('Pausability', function () {
  describe('Should pause and unpause', function () {
    it('pause', async function () {
      const { handoff, owner1 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).pause();
      expect(await handoff.paused()).to.be.true;
    });

    it('unpause', async function () {
      const { handoff, owner1 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).pause();
      await handoff.connect(owner1).unpause();
      expect(await handoff.paused()).to.be.false;
    });
  });

  describe('Should prevent offramp functions when paused', function () {
    it('offrampWithPermit', async function () {
      const { handoff, owner1, provider1, user1, token2, relayer1 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).pause();
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
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit(eip2616RequestSignature.eip712.message, eip2616RequestSignature.signature)
      ).to.be.revertedWithCustomError(handoff, 'EnforcedPause');
    });

    it('offrampWithPermit2', async function () {
      const { handoff, owner1, provider1, user1, token1, relayer1, permit2 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).pause();
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
      await expect(
        handoff
          .connect(relayer1)
          .offrampWithPermit2(permit2RequestSignature.eip712.message, permit2RequestSignature.signature)
      ).to.be.revertedWithCustomError(handoff, 'EnforcedPause');
    });
  });
});
