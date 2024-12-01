import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { time } from "@nomicfoundation/hardhat-network-helpers";
import { increaseTo } from "./helpers/time";
import { keccak256 } from "ethers";

const initialURI = "https://defi.bitbanker.org/{id}.json";

const fixture = async () => {
  const [operator, holder, ...otherAccounts] = await ethers.getSigners();
  const factoryToken = await ethers.getContractFactory("bbFix");
  const token = await factoryToken.deploy(operator, operator, initialURI);
  const factoryUSD = await ethers.getContractFactory("bbUSD");
  const usd = await factoryUSD.deploy(operator.address);
  const factoryPool = await ethers.getContractFactory("bbFixPool");
  const pool = await factoryPool.deploy(
    token.getAddress(),
    usd.getAddress(),
    operator.address
  );
  return { token, usd, pool, operator, holder, otherAccounts };
};

describe("bbFixPool", () => {
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";
  const MINTER_ROLE =
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
  beforeEach(async function () {
    const {
      token,
      usd,
      pool,
      operator,
      holder,
      otherAccounts,
    } = await loadFixture(fixture);
    Object.assign(this, { token, usd, pool, operator, holder, otherAccounts });
    const timestamp = await time.latest();
    this.params = {
      tokenId: 1,
      price: 115n * 10n ** 16n,
      investmentStartDate: timestamp + 10_000,
      investmentEndDate: timestamp + 20_000,
      settlementDate: timestamp + 30_000,
      minSupply: 1000n * 10n ** 18n,
      maxSupply: 100_000n * 10n ** 18n,
    };
  });

  describe("pool creation", async function () {
    describe("wrong cases", async function () {
      it("OPERATOR_ROLE is not granted", async function () {
        await expect(
          this.pool.createPool(
            this.params.tokenId,
            this.params.price,
            this.params.investmentStartDate,
            this.params.investmentEndDate,
            this.params.settlementDate,
            this.params.minSupply,
            this.params.maxSupply
          )
        )
          .to.be.revertedWithCustomError(
            this.pool,
            "AccessControlUnauthorizedAccount"
          )
          .withArgs(this.operator.address, OPERATOR_ROLE);
      });

      describe("parameters", async function () {
        this.beforeEach(async function () {
          await this.pool.grantRole(OPERATOR_ROLE, this.operator);
        });

        it("price <= 10^18 (DENOMINATOR)", async function () {
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              10n ** 18n,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              10n ** 18n - 1n,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              10n ** 18n + 1n,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.not.be.reverted;
        });

        it("investmentStartDate >= investmentEndDate", async function () {
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentEndDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentEndDate + 1,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentEndDate - 1,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.not.be.reverted;
        });

        it("investmentEndDate >= settlementDate", async function () {
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.investmentEndDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.investmentEndDate - 1,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.investmentEndDate + 1,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.not.be.reverted;
        });

        it("minSupply > maxSupply", async function () {
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.minSupply - 1n
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidParameters");
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.minSupply
            )
          ).to.not.be.reverted;
          await expect(
            this.pool.createPool(
              this.params.tokenId + 1,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.minSupply + 1n
            )
          ).to.not.be.reverted;
        });
        it("existing token id", async function () {
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.not.be.reverted;
          await expect(
            this.pool.createPool(
              this.params.tokenId,
              this.params.price,
              this.params.investmentStartDate,
              this.params.investmentEndDate,
              this.params.settlementDate,
              this.params.minSupply,
              this.params.maxSupply
            )
          ).to.be.revertedWithCustomError(this.pool, "InvalidToken");
        });
      });
    });

    it("should create pool", async function () {
      await this.pool.grantRole(OPERATOR_ROLE, this.operator);
      await expect(
        this.pool.createPool(
          this.params.tokenId,
          this.params.price,
          this.params.investmentStartDate,
          this.params.investmentEndDate,
          this.params.settlementDate,
          this.params.minSupply,
          this.params.maxSupply
        )
      ).to.not.be.reverted;
    });
  });

  describe("pool operations", async function () {
    this.beforeEach(async function () {
      await this.pool.grantRole(OPERATOR_ROLE, this.operator);
      await this.pool.createPool(
        this.params.tokenId,
        this.params.price,
        this.params.investmentStartDate,
        this.params.investmentEndDate,
        this.params.settlementDate,
        this.params.minSupply,
        this.params.maxSupply
      );
    });

    describe("time < investmentStartDate", async function () {
      this.beforeEach(async function () {
        const timestamp = await time.latest();
        expect(timestamp).to.lte(this.params.investmentStartDate);
        this.decimals = await this.usd.decimals();
        await this.usd.approve(this.holder, 10000n * 10n ** this.decimals);
        await this.usd.transfer(this.holder, 10000n * 10n ** this.decimals);
        await this.token.grantRole(MINTER_ROLE, this.pool);
      });

      it("should not accept user investments", async function () {
        expect(await this.pool.canInvest(this.params.tokenId)).to.be.false;
        await expect(
          this.pool
            .connect(this.holder)
            .invest(this.params.tokenId, this.params.minSupply)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept user withdrawals", async function () {
        expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.false;
        await expect(
          this.pool.connect(this.holder).withdraw(this.params.tokenId, 1)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept user redeems", async function () {
        expect(await this.pool.canRedeem(this.params.tokenId)).to.be.false;
        await expect(
          this.pool.connect(this.holder).redeem(this.params.tokenId)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept operator withdrawals", async function () {
        await expect(
          this.pool.operatorWithdraw(this.params.tokenId)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });
      it("should not accept operator deposits", async function () {
        await expect(
          this.pool.operatorDeposit(this.params.tokenId, 1000)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });
    });

    describe("investmentStartDate < time < investmentEndDate", async function () {
      this.beforeEach(async function () {
        await increaseTo.timestamp(this.params.investmentStartDate + 1, true);
        const timestamp = await time.latest();
        expect(timestamp).to.gt(this.params.investmentStartDate);
        expect(timestamp).to.lte(this.params.investmentEndDate);
        this.decimals = await this.usd.decimals();
        await this.usd.approve(this.holder, 10000n * 10n ** this.decimals);
        await this.usd.transfer(this.holder, 10000n * 10n ** this.decimals);
        await this.token.grantRole(MINTER_ROLE, this.pool);
      });

      it("should accept user investments", async function () {
        expect(await this.pool.canInvest(this.params.tokenId)).to.be.true;
        const amountUsd = 1000n * 10n ** this.decimals;
        const balanceUsdHolderBefore = await this.usd.balanceOf(this.holder);
        const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
        await this.usd.connect(this.holder).approve(this.pool, amountUsd);
        await this.pool
          .connect(this.holder)
          .invest(this.params.tokenId, amountUsd);
        const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
        const balanceUsdHolderAfter = await this.usd.balanceOf(this.holder);
        expect(balanceUsdPoolAfter - balanceUsdPoolBefore).eq(amountUsd);
        expect(balanceUsdHolderBefore - balanceUsdHolderAfter).eq(amountUsd);
      });

      it("should accept user all funds withdrawal", async function () {
        const amountUsd = 1000n * 10n ** this.decimals;
        await this.usd.connect(this.holder).approve(this.pool, amountUsd);
        await this.pool
          .connect(this.holder)
          .invest(this.params.tokenId, amountUsd);
        expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.true;
        const balanceUsdHolderBefore = await this.usd.balanceOf(this.holder);
        const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
        await this.token
          .connect(this.holder)
          .setApprovalForAll(this.pool, true);
        await this.pool
          .connect(this.holder)
          .withdraw(this.params.tokenId, amountUsd);
        const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
        const balanceUsdHolderAfter = await this.usd.balanceOf(this.holder);
        expect(balanceUsdPoolBefore - balanceUsdPoolAfter).eq(amountUsd);
        expect(balanceUsdHolderAfter - balanceUsdHolderBefore).eq(amountUsd);
      });

      it("should accept user partial funds withdrawal", async function () {
        const amountUsd = 100n * 10n ** this.decimals;
        await this.usd.connect(this.holder).approve(this.pool, amountUsd);
        await this.pool
          .connect(this.holder)
          .invest(this.params.tokenId, amountUsd);
        expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.true;
        const balanceUsdHolderBefore = await this.usd.balanceOf(this.holder);
        const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
        await this.token
          .connect(this.holder)
          .setApprovalForAll(this.pool, true);
        await this.pool
          .connect(this.holder)
          .withdraw(this.params.tokenId, amountUsd);
        const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
        const balanceUsdHolderAfter = await this.usd.balanceOf(this.holder);
        expect(balanceUsdPoolBefore - balanceUsdPoolAfter).eq(amountUsd);
        expect(balanceUsdHolderAfter - balanceUsdHolderBefore).eq(amountUsd);
      });

      it("should not accept user redeems", async function () {
        const amountUsd = 1000n * 10n ** this.decimals;
        await this.usd.connect(this.holder).approve(this.pool, amountUsd);
        await this.pool
          .connect(this.holder)
          .invest(this.params.tokenId, amountUsd);
        expect(await this.pool.canRedeem(this.params.tokenId)).to.be.false;
        await expect(
          this.pool.connect(this.holder).redeem(this.params.tokenId)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept operator withdrawals", async function () {
        await expect(
          this.pool.operatorWithdraw(this.params.tokenId)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });
      it("should not accept operator deposits", async function () {
        await expect(
          this.pool.operatorDeposit(this.params.tokenId, 1150n * 10n ** 18n)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });
    });

    describe("investmentEndDate < time < settlementDate", async function () {
      this.beforeEach(async function () {
        this.decimals = await this.usd.decimals();
        await this.usd.approve(this.holder, 10000n * 10n ** this.decimals);
        await this.usd.transfer(this.holder, 10000n * 10n ** this.decimals);
        await this.token.grantRole(MINTER_ROLE, this.pool);
      });

      describe("collected funds agnostic", async function () {
        this.beforeEach(async function () {
          await increaseTo.timestamp(this.params.investmentEndDate + 1, true);
          const timestamp = await time.latest();
          expect(timestamp).to.gt(this.params.investmentEndDate);
          expect(timestamp).to.lte(this.params.settlementDate);
        });

        it("should not accept user investments", async function () {
          expect(await this.pool.canInvest(this.params.tokenId)).to.be.false;
          await expect(
            this.pool
              .connect(this.holder)
              .invest(this.params.tokenId, this.params.minSupply)
          ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
        });

        it("should not accept user redeems", async function () {
          expect(await this.pool.canRedeem(this.params.tokenId)).to.be.false;
          await expect(
            this.pool.connect(this.holder).redeem(this.params.tokenId)
          ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
        });
      });

      describe("collected funds >= minCap", async function () {
        this.beforeEach(async function () {
          const amountUsd = this.params.minSupply;
          await this.usd.connect(this.holder).approve(this.pool, amountUsd);
          await increaseTo.timestamp(this.params.investmentEndDate - 10, true);
          await expect(
            this.pool
              .connect(this.holder)
              .invest(this.params.tokenId, amountUsd)
          ).to.not.be.reverted;
          await increaseTo.timestamp(this.params.investmentEndDate + 1, true);
          const timestamp = await time.latest();
          expect(timestamp).to.gt(this.params.investmentEndDate);
          expect(timestamp).to.lte(this.params.settlementDate);
        });

        it("should accept operator withdrawals", async function () {
          const balanceUsdOperatorBefore = await this.usd.balanceOf(
            this.operator
          );
          const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
          await this.pool.operatorWithdraw(this.params.tokenId)
          const balanceUsdOperatorAfter = await this.usd.balanceOf(
            this.operator
          );
          const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
          expect(balanceUsdOperatorAfter - balanceUsdOperatorBefore).eq(
            balanceUsdPoolBefore
          );
          expect(balanceUsdPoolAfter).eq(0);
        });

        it("should revert operator consecutive withdrawals", async function () {
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.not.be
            .reverted;
          await expect(
            this.pool.operatorWithdraw(this.params.tokenId)
          ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
        });

        it("should accept operator deposits for expected returns", async function () {
          const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.not.be
            .reverted;
          const payoutUsd =  amountUsd * 115n / 100n; 
          await this.usd.approve(this.pool, payoutUsd);
          await expect(this.pool.operatorDeposit(this.params.tokenId, payoutUsd))
            .to.not.be.reverted;
        });

        it("should accept operator deposits below expected returns", async function () {
          const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.not.be
            .reverted;
          const payoutUsd =  amountUsd * 115n / 100n - 1n; 
          await this.usd.approve(this.pool, payoutUsd);
    
          await this.pool.operatorDeposit(this.params.tokenId, payoutUsd);
        });

        it("should accept operator multiple deposits", async function () {
          const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.not.be
            .reverted;
          const payoutUsd =  amountUsd * 115n / 100n - 1n; 
          await this.usd.approve(this.pool, payoutUsd);
          await this.pool.operatorDeposit(this.params.tokenId, payoutUsd);
          await this.usd.approve(this.pool, 1);
          await this.pool.operatorDeposit(this.params.tokenId, 1);
        });

        it("should round operator deposits bigger than expected returns to right value", async function () {
          const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.not.be
            .reverted;
          const payoutUsd =  amountUsd * 115n / 100n; 
          const extraPayoutUsd =  payoutUsd * (1n + 3n / 10n); 
          const balanceUsd = await this.usd.balanceOf(this.operator)
          await this.usd.approve(this.pool, extraPayoutUsd);
          await expect(this.pool.operatorDeposit(this.params.tokenId, extraPayoutUsd))
            .to.not.be.reverted;
          expect(  await this.usd.balanceOf(this.operator)).to.eq( balanceUsd - payoutUsd);
        });

        it("should not accept user investments", async function () {
          expect(await this.pool.canInvest(this.params.tokenId)).to.be.false;
          await expect(
            this.pool
              .connect(this.holder)
              .invest(this.params.tokenId, this.params.minSupply)
          ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
        });

        it("should not accept user redeems", async function () {
          expect(await this.pool.canRedeem(this.params.tokenId)).to.be.false;
          await expect(
            this.pool.connect(this.holder).redeem(this.params.tokenId)
          ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
        });
      });

      describe("collected funds < minCap", async function () {
        this.beforeEach(async function () {
          const amountUsd = this.params.minSupply-1n;
          await this.usd.connect(this.holder).approve(this.pool, amountUsd);
          await increaseTo.timestamp(this.params.investmentEndDate - 10, true);
          await expect(
            this.pool
              .connect(this.holder)
              .invest(this.params.tokenId, amountUsd)
          ).to.not.be.reverted;
          await increaseTo.timestamp(this.params.investmentEndDate + 1, true);
          const timestamp = await time.latest();
          expect(timestamp).to.gt(this.params.investmentEndDate);
          expect(timestamp).to.lte(this.params.settlementDate);
        });

        it("should not accept operator withdrawals", async function () {
          await expect(this.pool.operatorWithdraw(this.params.tokenId)).to.be.revertedWithCustomError(this.pool, 'InvalidOperation');
        });

        it("should not accept operator deposits", async function () {
          await this.usd.approve(this.pool, 1);
          await expect(this.pool.operatorDeposit(this.params.tokenId,1)).to.be.revertedWithCustomError(this.pool, 'InvalidOperation');
        });

        it("should accept user all funds withdrawal", async function () {
          const amountBase = await this.token.balanceOf( this.holder, this.params.tokenId);
          const amountUsd = this.params.minSupply-1n;
          expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.true;
          const balanceUsdHolderBefore = await this.usd.balanceOf(this.holder);
          const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
          await this.token
            .connect(this.holder)
            .setApprovalForAll(this.pool, true);
          await this.pool
            .connect(this.holder)
            .withdraw(this.params.tokenId, amountUsd);
          const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
          const balanceUsdHolderAfter = await this.usd.balanceOf(this.holder);
          expect(balanceUsdPoolBefore - balanceUsdPoolAfter).eq(amountUsd);
          expect(balanceUsdHolderAfter - balanceUsdHolderBefore).eq(amountUsd);
        });
  
        it("should accept user partial funds withdrawal", async function () {
          const amountUsd = 100n * 10n ** this.decimals;
        
          expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.true;
          const balanceUsdHolderBefore = await this.usd.balanceOf(this.holder);
          const balanceUsdPoolBefore = await this.usd.balanceOf(this.pool);
          await this.token
            .connect(this.holder)
            .setApprovalForAll(this.pool, true);
          await this.pool
            .connect(this.holder)
            .withdraw(this.params.tokenId, amountUsd);
          const balanceUsdPoolAfter = await this.usd.balanceOf(this.pool);
          const balanceUsdHolderAfter = await this.usd.balanceOf(this.holder);
          expect(balanceUsdPoolBefore - balanceUsdPoolAfter).eq(amountUsd);
          expect(balanceUsdHolderAfter - balanceUsdHolderBefore).eq(amountUsd);
        });
      });
    });

    describe("time >= settlementDate", async function () {
      this.beforeEach(async function () {
        this.decimals = await this.usd.decimals();
        await this.usd.approve(this.holder, 10000n * 10n ** this.decimals);
        await this.usd.transfer(this.holder, 10000n * 10n ** this.decimals);
        await this.token.grantRole(MINTER_ROLE, this.pool);
        const amountUsd = this.params.minSupply;
        await this.usd.connect(this.holder).approve(this.pool, amountUsd);
        await increaseTo.timestamp(this.params.investmentEndDate - 10, true);
        await expect(
          this.pool
            .connect(this.holder)
            .invest(this.params.tokenId, amountUsd)
        ).to.not.be.reverted;
        await increaseTo.timestamp(this.params.settlementDate + 1, true);
        const timestamp = await time.latest();
        expect(timestamp).to.gte(this.params.settlementDate);
      });

      it("should not accept user investments", async function () {
        expect(await this.pool.canInvest(this.params.tokenId)).to.be.false;
        await expect(
          this.pool
            .connect(this.holder)
            .invest(this.params.tokenId, this.params.minSupply)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept user withdrawals", async function () {
        expect(await this.pool.canWidthdraw(this.params.tokenId)).to.be.false;
        await expect(
          this.pool.connect(this.holder).withdraw(this.params.tokenId, 1)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });

      it("should not accept operator withdrawals", async function () {
        await expect(
          this.pool.operatorWithdraw(this.params.tokenId)
        ).to.be.revertedWithCustomError(this.pool, "InvalidOperation");
      });
      it("should accept operator deposits for expected returns", async function () {
        const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
       
        const payoutUsd =  amountUsd * 115n / 100n; 
        await this.usd.approve(this.pool, payoutUsd);
        await this.pool.operatorDeposit(this.params.tokenId, payoutUsd);
      });

      it("should accept operator deposits below expected returns", async function () {
        const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
        const payoutUsd =  amountUsd * 115n / 100n - 1n; 
        await this.usd.approve(this.pool, payoutUsd);
        await this.pool.operatorDeposit(this.params.tokenId, payoutUsd);
      });

      it("should accept operator multiple deposits", async function () {
        const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
        
        const payoutUsd =  amountUsd * 115n / 100n - 100n; 
        const firstDeposit = (payoutUsd - amountUsd) / 3n;
        const secondDeposit = payoutUsd - amountUsd - firstDeposit; 
        await this.usd.approve(this.pool, firstDeposit);
        await this.pool.operatorDeposit(this.params.tokenId, firstDeposit);
        await this.usd.approve(this.pool, secondDeposit);
        await this.pool.operatorDeposit(this.params.tokenId, secondDeposit);
      });

      it("should round operator deposits bigger than expected returns to right value", async function () {
        const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
        const payoutUsd =  amountUsd * 115n / 100n - amountUsd; 
        const extraPayoutUsd =  payoutUsd * (1n + 3n / 10n); 
        const balanceUsd = await this.usd.balanceOf(this.operator)
        await this.usd.approve(this.pool, extraPayoutUsd);
        await expect(this.pool.operatorDeposit(this.params.tokenId, extraPayoutUsd))
          .to.not.be.reverted;
        expect(  await this.usd.balanceOf(this.operator)).to.eq( balanceUsd - payoutUsd);
      });


      it("should accept user redeems", async function () {
        expect(await this.pool.canRedeem(this.params.tokenId)).to.be.true;
        const amountUsd = await this.pool.getPoolAccumulatedFunds(this.params.tokenId);
        const payoutUsd =  amountUsd * 115n / 100n; 
        await this.usd.approve(this.pool, payoutUsd);
        await expect(
          this.pool.operatorDeposit(this.params.tokenId, payoutUsd)
        ).to.not.be.reverted
        await this.token
        .connect(this.holder)
        .setApprovalForAll(this.pool, true);
        const balanceUsdBefore = await this.usd.balanceOf(this.holder);
        await this.pool.connect(this.holder).redeem(this.params.tokenId)
        const balanceUsdAfter = await this.usd.balanceOf(this.holder);
        expect( balanceUsdAfter - balanceUsdBefore).to.eq(payoutUsd);
      });

    });
  });
});
