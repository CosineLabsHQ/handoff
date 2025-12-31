import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture } from './utils/helpers';
import { createEIP2616Signature, createEIP2616RequestSignature } from './utils/signing/eip2616';
import { createPermit2Signature, createPermit2RequestSignature } from './utils/signing/permit2';

describe('Offramp', function () {
  describe('Should offrampWithPermit and offrampWithPermit2', function () {
    it('offrampWithPermit', async function () {});

    it('offrampWithPermit2', async function () {});
  });
});
