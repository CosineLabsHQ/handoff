import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';

describe('Address Management', function () {
  describe('Should add/remove relayer, and transfer/renounce owner', function () {
    it('addRelayer', async function () {
      const { handoff, owner1, relayer2, relayers } = await loadFixture(deployFixture);
      expect(await handoff.connect(owner1).relayers(0)).to.be.eq(relayers[0]);
      await expect(handoff.connect(owner1).addRelayer(relayer2)).to.emit(handoff, 'RelayerAdded').withArgs(relayer2);
      expect(await handoff.connect(owner1).relayers(1)).to.be.eq(relayer2);
    });

    it('removeRelayer', async function () {
      const { handoff, owner1, relayer1, relayers } = await loadFixture(deployFixture);
      expect(await handoff.connect(owner1).relayers(0)).to.be.eq(relayers[0]);
      await expect(handoff.connect(owner1).removeRelayer(relayer1))
        .to.emit(handoff, 'RelayerRemoved')
        .withArgs(relayer1);
    });

    it('transferOwnership', async function () {
      const { handoff, owner1, owner2 } = await loadFixture(deployFixture);
      expect(await handoff.connect(owner1).owner()).to.be.eq(owner1);
      await expect(handoff.connect(owner1).transferOwnership(owner2))
        .to.emit(handoff, 'OwnershipTransferred')
        .withArgs(owner1, owner2);
      expect(await handoff.connect(owner1).owner()).to.be.eq(owner2);
    });

    it('renounceOwnership', async function () {
      const { handoff, owner1 } = await loadFixture(deployFixture);
      expect(await handoff.connect(owner1).owner()).to.be.eq(owner1);
      await expect(handoff.connect(owner1).renounceOwnership())
        .to.emit(handoff, 'OwnershipTransferred')
        .withArgs(owner1, ethers.ZeroAddress);
      expect(await handoff.connect(owner1).owner()).to.be.eq(ethers.ZeroAddress);
    });
  });

  describe('Should get relayers', function () {
    it('getRelayers', async function () {
      const { handoff, user1, relayers } = await loadFixture(deployFixture);
      expect(await handoff.connect(user1).getRelayers()).to.deep.equal(relayers);
    });
  });
});
