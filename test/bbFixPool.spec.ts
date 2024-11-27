import { ethers }  from 'hardhat';
import  { expect } from 'chai';
import  { loadFixture }  from '@nomicfoundation/hardhat-network-helpers';

import  { zip } from './helpers/iterate';
import  { shouldBehaveLikeERC1155 } from './ERC1155.behavior';
import  { shouldBehaveLikeAccessControl} from './AccessControl.behavior';

const initialURI = 'https://defi.bitbanker.org/{id}.json';

const fixture = async () => {
  const [operator, holder, ...otherAccounts] = await ethers.getSigners();
  const factoryToken = await ethers.getContractFactory('bbFix')
  const token = await factoryToken.deploy(operator, operator, initialURI);
  const factoryMock = await ethers.getContractFactory('bbFixMock')
  const mock = await factoryMock.deploy(operator, operator, initialURI)
  return { token, mock, operator, holder, otherAccounts };
}

describe('bbFIX',  () => {
  
  beforeEach(async function () {
    const  { token, mock, operator, holder, otherAccounts } = await loadFixture(fixture)
    Object.assign(this, { token, mock, operator, holder, otherAccounts });
  });

  shouldBehaveLikeERC1155();

  describe('Access control', function() {
    shouldBehaveLikeAccessControl();
  })
  
  describe('methods', function () {
    const tokenId = 1990n;
    const mintValue = 9001n;
    const burnValue = 3000n;

    const tokenBatchIds = [2000n, 2010n, 2020n];
    const mintValues = [5000n, 10000n, 42195n];
    const burnValues = [5000n, 9001n, 195n];

    const data = '0x12345678';

    describe('mint', function () {
      it('reverts with a zero destination address', async function () {
        await expect(this.token.mint(ethers.ZeroAddress, tokenId, mintValue, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidReceiver')
          .withArgs(ethers.ZeroAddress);
      });

      describe('with minted tokens', function () {
        beforeEach(async function () {
          this.tx = await this.token.connect(this.operator).mint(this.holder, tokenId, mintValue, data);
        });

        it('emits a TransferSingle event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferSingle')
            .withArgs(this.operator, ethers.ZeroAddress, this.holder, tokenId, mintValue);
        });

        it('credits the minted token value', async function () {
          expect(await this.token.balanceOf(this.holder, tokenId)).to.equal(mintValue);
        });
      });
    });

    describe('mintBatch', function () {
      it('reverts with a zero destination address', async function () {
        await expect(this.token.mintBatch(ethers.ZeroAddress, tokenBatchIds, mintValues, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidReceiver')
          .withArgs(ethers.ZeroAddress);
      });

      it('reverts if length of inputs do not match', async function () {
        await expect(this.token.mintBatch(this.holder, tokenBatchIds, mintValues.slice(1), data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length, mintValues.length - 1);

        await expect(this.token.mintBatch(this.holder, tokenBatchIds.slice(1), mintValues, data))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length - 1, mintValues.length);
      });

      describe('with minted batch of tokens', function () {
        beforeEach(async function () {
          this.tx = await this.token.connect(this.operator).mintBatch(this.holder, tokenBatchIds, mintValues, data);
        });

        it('emits a TransferBatch event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferBatch')
            .withArgs(this.operator, ethers.ZeroAddress, this.holder, tokenBatchIds, mintValues);
        });

        it('credits the minted batch of tokens', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            tokenBatchIds.map(() => this.holder),
            tokenBatchIds,
          );

          expect(holderBatchBalances).to.deep.equal(mintValues);
        });
      });
    });

    describe('burn', function () {
      beforeEach(async function () {
        this.tx = await this.token.connect(this.holder).setApprovalForAll( this.operator, true);
      });

      it('reverts when burning a non-existent token id', async function () {
       
        await expect(this.token.burn(this.holder, tokenId, mintValue))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, 0, mintValue, tokenId);
      });

      it('reverts when burning more than available tokens', async function () {
        await this.token.connect(this.operator).mint(this.holder, tokenId, mintValue, data);
        await expect(this.token.burn(this.holder, tokenId, mintValue + 1n))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, mintValue, mintValue + 1n, tokenId);
      });

      describe('with minted-then-burnt tokens', function () {
        beforeEach(async function () {
          await this.token.mint(this.holder, tokenId, mintValue, data);
          this.tx = await this.token.connect(this.operator).burn(this.holder, tokenId, burnValue);
        });

        it('emits a TransferSingle event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferSingle')
            .withArgs(this.operator, this.holder, ethers.ZeroAddress, tokenId, burnValue);
        });

        it('accounts for both minting and burning', async function () {
          expect(await this.token.balanceOf(this.holder, tokenId)).to.equal(mintValue - burnValue);
        });
      });
    });

    describe('burnBatch', function () {
      beforeEach(async function () {
        this.tx = await this.token.connect(this.holder).setApprovalForAll( this.operator, true);
      });

      it('reverts if length of inputs do not match', async function () {
        await expect(this.token.burnBatch(this.holder, tokenBatchIds, burnValues.slice(1)))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length, burnValues.length - 1);

        await expect(this.token.burnBatch(this.holder, tokenBatchIds.slice(1), burnValues))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InvalidArrayLength')
          .withArgs(tokenBatchIds.length - 1, burnValues.length);
      });

      it('reverts when burning a non-existent token id', async function () {
  
        await expect(this.token.burnBatch(this.holder, tokenBatchIds, burnValues))
          .to.be.revertedWithCustomError(this.token, 'ERC1155InsufficientBalance')
          .withArgs(this.holder, 0, burnValues[0], tokenBatchIds[0]);
      });

      describe('with minted-then-burnt tokens', function () {
        beforeEach(async function () {
          await this.token.mintBatch(this.holder, tokenBatchIds, mintValues, data);
          this.tx = await this.token.connect(this.operator).burnBatch(this.holder, tokenBatchIds, burnValues);
        });

        it('emits a TransferBatch event', async function () {
          await expect(this.tx)
            .to.emit(this.token, 'TransferBatch')
            .withArgs(this.operator, this.holder, ethers.ZeroAddress, tokenBatchIds, burnValues);
        });

        it('accounts for both minting and burning', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            tokenBatchIds.map(() => this.holder),
            tokenBatchIds,
          );

          expect(holderBatchBalances).to.deep.equal(
            zip(mintValues, burnValues).map(([mintValue, burnValue]) => mintValue - burnValue),
          );
        });
      });
    });
  });

  describe('ERC1155MetadataURI', function () {
    const firstTokenID = 42n;
    const secondTokenID = 1337n;

    it('emits no URI event in constructor', async function () {
      await expect(this.token.deploymentTransaction()).to.not.emit(this.token, 'URI');
    });

    it('sets the initial URI for all token types', async function () {
      expect(await this.token.uri(firstTokenID)).to.equal(initialURI);
      expect(await this.token.uri(secondTokenID)).to.equal(initialURI);
    });

    describe('setURI', function () {
      const newURI = 'https://token-cdn-domain/{locale}/{id}.json';

      it('emits no URI event', async function () {
        await expect(this.token.setURI(newURI)).to.not.emit(this.token, 'URI');
      });

      it('sets the new URI for all token types', async function () {
        await this.token.setURI(newURI);

        expect(await this.token.uri(firstTokenID)).to.equal(newURI);
        expect(await this.token.uri(secondTokenID)).to.equal(newURI);
      });
    });
  });
});