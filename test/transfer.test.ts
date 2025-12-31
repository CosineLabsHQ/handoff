import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';

describe('Transfer', function () {
  describe('Should receive native and ERC-20 token', function () {
    it('native token (e.g., ETH, POL, BNB, AVAX)', async function () {
      const { handoff, provider1 } = await loadFixture(deployFixture);
      const contractBalanceBefore = (await handoff.runner?.provider?.getBalance(await handoff.getAddress())) as bigint;
      const amount = ethers.parseUnits('0.5', 18);
      await provider1.sendTransaction({
        to: handoff.getAddress(),
        value: amount,
        data: '0x'
      });
      const contractBalanceAfter = (await handoff.runner?.provider?.getBalance(await handoff.getAddress())) as bigint;
      expect(contractBalanceBefore + amount).to.equals(contractBalanceAfter);
    });

    it('ERC-20 token (e.g., USDC, USDT)', async function () {
      const { handoff, token1, provider1 } = await loadFixture(deployFixture);
      const contractBalanceBefore = await token1.balanceOf(await handoff.getAddress());
      const amount = ethers.parseUnits('100', 18);
      await token1.connect(provider1).transfer(await handoff.getAddress(), amount);
      const contractBalanceAfter = await token1.balanceOf(await handoff.getAddress());
      expect(contractBalanceBefore + amount).to.equals(contractBalanceAfter);
    });
  });

  describe('Should transfer native and ERC-20 token', function () {
    it('transferNative', async function () {
      const { handoff, owner1, provider1, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits('0.5', 18);
      await provider1.sendTransaction({
        to: handoff.getAddress(),
        value: amount,
        data: '0x'
      });
      await expect(handoff.connect(owner1).transferNative(user1.address, amount))
        .to.emit(handoff, 'NativeTransferred')
        .withArgs(user1.address, amount);
    });

    it('transferToken', async function () {
      const { handoff, owner1, token1, provider1, user1 } = await loadFixture(deployFixture);
      const token = await token1.getAddress();
      const amount = ethers.parseUnits('100', 18);
      await token1.connect(provider1).transfer(await handoff.getAddress(), amount);
      await expect(handoff.connect(owner1).transferToken(token, user1.address, amount))
        .to.emit(handoff, 'TokenTransferred')
        .withArgs(token, user1.address, amount);
    });
  });
});
