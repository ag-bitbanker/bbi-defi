// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {FullMath} from "./libraries/FullMath.sol";
import {LowGasSafeMath} from "./libraries/LowGasSafeMath.sol";

enum PoolState {
    Idle,
    Open,
    Closed,
    Running,
    Settled
}

struct PoolData {
    uint256 price;      // settlement price
    uint256[3] date;    // pool open, close, settled datess
    uint256[2] limit;   // min, max
    uint256[3] balance; // base, quote (total, hold by contract)
}

error InvalidParameters();

contract Pool {
    using LowGasSafeMath for uint256;
    uint256 internal constant PRICE_DENOMINATOR = 10 ** 18;

    mapping(uint256 tokenId => PoolData) private _pool;

    function _createPool(uint256 price, uint256 openDate, uint256 closeDate, uint256 settleDate, uint256 minAmount, uint256 maxAmount) internal view returns (PoolData memory) {
        if ( openDate >= closeDate || closeDate >= settleDate || closeDate <= block.timestamp || minAmount > maxAmount || price <= PRICE_DENOMINATOR) revert InvalidParameters();
   
        PoolData memory pool;

        pool.price = price;
        pool.date = [openDate,closeDate,settleDate];
        pool.limit = [minAmount,maxAmount];
        pool.balance = [uint256(0),uint256(0),uint256(0)];
        return pool;
    }

    function _getPrice(PoolData memory pool ) internal pure returns( uint256) {
        return pool.price;
    }

    function _getDates(PoolData memory pool ) internal pure returns( uint256 openedAt, uint256 closedAt, uint256 settledAt ) {
        openedAt = pool.date[0];
        closedAt = pool.date[1];
        settledAt = pool.date[2]; 
    }

    function _getLimits(PoolData memory pool) internal pure returns ( uint256 min, uint256 max) {
        min = pool.limit[0];
        max = pool.limit[1];
    }

    function _getBalances( PoolData memory pool) internal pure returns (uint256 baseTokenAmount, uint256 quoteTokenAmount, uint256 quoteTokenAmountLocked) {
        baseTokenAmount = pool.balance[0];
        quoteTokenAmount = pool.balance[1];
        quoteTokenAmountLocked = pool.balance[2];
    }

    function _getPool( uint256 tokenId) internal view returns (PoolData memory) {
        return _pool[tokenId];
    }

    function _update( uint256 tokenId, PoolData memory pool) internal {
        _pool[tokenId] = pool;
    }

    function _getPoolState( PoolData memory pool) internal view returns (PoolState) {
        if ( block.timestamp < pool.date[0]) return PoolState.Idle;
        if ( block.timestamp < pool.date[1]) return PoolState.Open;
        if ( pool.balance[1] <  pool.limit[0] )return PoolState.Closed;
        return block.timestamp < pool.date[2] ? PoolState.Running : PoolState.Settled;
    }

    function _exists(PoolData memory pool) internal pure  returns (bool) {
        return pool.price > 0;
    }

    function _canUserInvest(PoolData memory pool) internal view returns (bool) {
        return _getPoolState(pool) == PoolState.Open;
    }

    function _canUserWidthdraw(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
        //console.log('_canUserWidthdraw');
        //printState(pool);
        return  state == PoolState.Open || state == PoolState.Closed;
    }

    function _canUserRedeem(PoolData memory pool) internal view returns (bool) {
        return _getPoolState(pool) == PoolState.Settled;
    }

    function _canOperatorWidthdraw(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
       // printState(pool);
       // console.log( pool.balance[0],pool.balance[1],pool.balance[2]);
       
        return  state == PoolState.Running && pool.balance[2] > 0;
    }

     function _canOperatorDeposit(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
        return  (state == PoolState.Running || state == PoolState.Settled);
    }

    function _getUserInvestmentAmounts( PoolData memory pool, uint256 amountQuoteIn) internal pure returns (uint256 amountBase, uint256 amountQuote) {
        // calculate pool capacity
        uint256 capacity = pool.limit[1].sub(pool.balance[1]);
        if ( capacity == 0) {
            amountBase = 0;
            amountQuote = 0;
        } else {
            amountQuote = amountQuoteIn > capacity ? capacity : amountQuoteIn;
            amountBase = FullMath.mulDiv(amountQuote, pool.price, PRICE_DENOMINATOR);  
        }
    }

    function _getOperatorWithdrawalAmount( PoolData memory pool ) internal pure returns (uint256) {
       return pool.balance[2];
    }

    function _getOperatorDepositAmount( PoolData memory pool, uint256 amount ) internal pure returns(uint256) {
        uint256 maxDeposit = pool.balance[0].sub(pool.balance[2]);
        return maxDeposit < amount ? maxDeposit : amount;
    }

    function _getUserWithdrawalAmount( PoolData memory pool, uint256 amountBaseIn ) internal pure returns (uint256 amountBase, uint256 amountQuote) {
       uint256 maxQuote = pool.balance[2];  // gas saving
       uint256 maxBase = pool.balance[0];   // gas saving
       amountBase = amountBaseIn > maxBase ? maxBase: amountBaseIn;
       amountQuote = FullMath.mulDiv(amountBase, PRICE_DENOMINATOR, pool.price );  
       if ( amountQuote > maxQuote) {
            amountQuote = maxQuote;
             amountBase = FullMath.mulDiv(amountQuote, pool.price, PRICE_DENOMINATOR);  
       }
    }

    function _calculateAmountQuote(PoolData memory pool, uint256 amountBase) internal pure returns (uint256) {
        return FullMath.mulDiv(amountBase, PRICE_DENOMINATOR, pool.price );  
    }
    
    function _onUserInvest( PoolData memory pool, uint256 amountBase, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[0] = amountBase.add(pool.balance[0]);
        pool.balance[1] = amountQuote.add(pool.balance[1]);
        pool.balance[2] = amountQuote.add(pool.balance[2]);
        return pool;
    }

    function _onUserWithdraw( PoolData memory pool, uint256 amountBase, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[0] = pool.balance[0].sub(amountBase);
        pool.balance[1] = pool.balance[1].sub(amountQuote);
        pool.balance[2] = pool.balance[2].sub(amountQuote);
        return pool;
    }

    function _onUserRedeem( PoolData memory pool, uint256 amountBase ) internal pure returns (PoolData memory) {
        pool.balance[0] = pool.balance[0].sub(amountBase);
        pool.balance[2] = pool.balance[2].sub(amountBase);
        return pool;
    }
    
    function _onOperatorWithdraw( PoolData memory pool, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[2] = pool.balance[2].sub(amountQuote);
        return pool;
    } 

    function _onOperatorDeposit( PoolData memory pool, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[2] = amountQuote.add(pool.balance[2]);
        return pool;
    }    

}
