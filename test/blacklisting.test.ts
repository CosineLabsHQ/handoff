import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';
import { createEIP2616RequestSignature, createEIP2616Signature } from './utils/signing/eip2616';
import { createPermit2Signature, createPermit2RequestSignature } from './utils/signing/permit2';

describe('Blacklisting', function () {
  describe('Should blacklist and unblacklist users', function () {
    it('blacklist', async function () {
      const { handoff, owner1, user1, user2 } = await loadFixture(deployFixture);
      await expect(handoff.connect(owner1).blacklist([user1.address, user2.address]))
        .to.emit(handoff, 'Blacklisted')
        .withArgs(user1.address)
        .and.to.emit(handoff, 'Blacklisted')
        .withArgs(user2.address);
      expect(await handoff.blacklistRegistry(user1.address)).to.be.true;
      expect(await handoff.blacklistRegistry(user2.address)).to.be.true;
    });

    it('unblacklist', async function () {
      const { handoff, owner1, user1, user2 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).blacklist([user1.address, user2.address]);
      await expect(handoff.connect(owner1).unBlacklist(user1.address))
        .to.emit(handoff, 'UnBlacklisted')
        .withArgs(user1.address);
      await expect(handoff.connect(owner1).unBlacklist(user2.address))
        .to.emit(handoff, 'UnBlacklisted')
        .withArgs(user2.address);
      expect(await handoff.blacklistRegistry(user1.address)).to.be.false;
      expect(await handoff.blacklistRegistry(user2.address)).to.be.false;
    });
  });

  describe('Should not emit event when blacklisting already blacklisted user', function () {
    it('blacklist', async function () {
      const { handoff, owner1, user1 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).blacklist([user1.address]);
      const tx = await handoff.connect(owner1).blacklist([user1.address]);
      const receipt = await tx.wait();
      const blacklistedEvents = receipt?.logs.filter((log) => {
        try {
          const parsed = handoff.interface.parseLog(log);
          return parsed?.name === 'Blacklisted';
        } catch {
          return false;
        }
      });
      expect(blacklistedEvents).to.have.length(0);
    });
  });

  describe('Should prevent blacklisted users from offramping crypto', function () {
    it('offrampWithPermit', async function () {
      const { handoff, owner1, user1, token2, provider1, relayer1 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).blacklist([user1.address]);
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
      ).to.be.revertedWith('user is blacklisted');
    });

    it('offrampWithPermit2', async function () {
      const { handoff, owner1, user1, token1, relayer1, provider1, permit2 } = await loadFixture(deployFixture);
      await handoff.connect(owner1).blacklist([user1.address]);
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
      ).to.be.revertedWith('user is blacklisted');
    });
  });
});
