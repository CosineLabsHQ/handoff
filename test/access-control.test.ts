import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';

describe('Access Control', function () {
  describe('Should restrict owner functions to owner only', function () {
    it('pause/unpause', async function () {
      const { handoff, user1, user2 } = await loadFixture(deployFixture);
      await expect(handoff.connect(user1).pause()).to.be.revertedWithCustomError(handoff, 'OwnableUnauthorizedAccount');
      await expect(handoff.connect(user2).unpause()).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
    });

    it('addRelayer/removeRelayer', async function () {
      const { handoff, user1, relayer1, relayer2 } = await loadFixture(deployFixture);
      await expect(handoff.connect(user1).addRelayer(relayer2.address)).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
      await expect(handoff.connect(user1).removeRelayer(relayer1)).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
    });

    it('blacklist/unBlacklist', async function () {
      const { handoff, user1, user2 } = await loadFixture(deployFixture);
      await expect(handoff.connect(user1).blacklist([user2.address])).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
      await expect(handoff.connect(user1).unBlacklist(user2.address)).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
    });

    it('transferNative/transferToken', async function () {
      const { handoff, user1, user2, token1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits('100', 18);
      await expect(handoff.connect(user1).transferNative(user2.address, amount)).to.be.revertedWithCustomError(
        handoff,
        'OwnableUnauthorizedAccount'
      );
      await expect(
        handoff.connect(user1).transferToken(await token1.getAddress(), user2.address, amount)
      ).to.be.revertedWithCustomError(handoff, 'OwnableUnauthorizedAccount');
    });
  });
});
