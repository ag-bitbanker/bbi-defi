// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {FullMath} from "./libraries/FullMath.sol";
import {LowGasSafeMath} from "./libraries/LowGasSafeMath.sol";

enum PoolState {
    Idle,           // before start date
    Open,           // collecting funds
    Closed,         // not enought funds were collected; user can withraw funds
    Running,        // funds were successfully collectede, investment is running
    Settled         // investment is settled, user can redeem funds
}

struct PoolData {
    uint256  price;     // base/quote tokeen initial exchange rate
    uint256[3] date;    // pool open, close, settled dates
    uint256[2] limit;   // min, max
    uint256[3] balance; // base, quote (total, hold by contract)
}

error InvalidParameters();

contract Pool {
    using LowGasSafeMath for uint256;
    uint256 internal constant PRICE_DENOMINATOR = 10 ** 18;

    mapping(uint256 tokenId => PoolData) private _pool;

    /**
     * @dev Create pool with given parameters
     * @param price base/quote tokeen initial exchange rate
     * @param openDate when fund conlection start
     * @param openDate when fund conlection stops
     * @param settleDate when investment will be matured
     * @param minAmount min amount of quote token to be collected
     * @param maxAmount max amount of quote token to be collected
     * @return PoolData newly created pool
     */
    function _createPool(uint256 price, uint256 openDate, uint256 closeDate, uint256 settleDate, uint256 minAmount, uint256 maxAmount) internal view returns (PoolData memory) {
        if ( openDate >= closeDate || closeDate >= settleDate || closeDate <= block.timestamp || minAmount > maxAmount || price <= PRICE_DENOMINATOR) revert InvalidParameters();
   
        PoolData memory pool;

        pool.price = price;
        pool.date = [openDate,closeDate,settleDate];
        pool.limit = [minAmount,maxAmount];
        pool.balance = [uint256(0),uint256(0),uint256(0)];
        return pool;
    }

    /**
     * @dev Base token to quote token exchange rate
     * @param pool Pool data
     * @return price quote to basee token exchange rate
     */
    function _getPrice(PoolData memory pool ) internal pure returns( uint256) {
        return pool.price;
    }

    /**
     * @dev Pool dates
     * @param pool Pool data
     * @return openedAt start date
     * @return closedAt end date
     * @return settledAt settement date
     */
    function _getDates(PoolData memory pool ) internal pure returns( uint256 openedAt, uint256 closedAt, uint256 settledAt ) {
        openedAt = pool.date[0];
        closedAt = pool.date[1];
        settledAt = pool.date[2]; 
    }
    /**
     * @dev Pool limits
     * @param pool Pool data
     * @return min Min amount of quote token to be collected
     * @return max Max amount of quote token to be collected
     */
    function _getLimits(PoolData memory pool) internal pure returns ( uint256 min, uint256 max) {
        min = pool.limit[0];
        max = pool.limit[1];
    }

    /**
     * @dev Pool balances
     * @param pool Pool data
     * @return baseTokenAmount Base tokeen amount minted
     * @return quoteTokenAmount Quote token amount in pool
     * @return quoteTokenAmountLocked Quote token amount owned by contract
     */
    function _getBalances( PoolData memory pool) internal pure returns (uint256 baseTokenAmount, uint256 quoteTokenAmount, uint256 quoteTokenAmountLocked) {
        baseTokenAmount = pool.balance[0];
        quoteTokenAmount = pool.balance[1];
        quoteTokenAmountLocked = pool.balance[2];
    }

    /**
     * @dev Pool accessor
     * @param tokenId Token ID
     * @return PoolData Pool data corrispondint to token ID
     */
    function _getPool( uint256 tokenId) internal view returns (PoolData memory) {
        return _pool[tokenId];
    }

    /**
     * @dev Update (store in blockchain) pool
     * @param tokenId Token ID
     * @param pool Pool data
     */
    function _update( uint256 tokenId, PoolData memory pool) internal {
        _pool[tokenId] = pool;
    }

    /**
     * @dev Calculate pool state
     * @param pool Pool data
     * @return PoolState Pool state enum
     */
    function _getPoolState( PoolData memory pool) internal view returns (PoolState) {
        if ( block.timestamp < pool.date[0]) return PoolState.Idle;
        if ( block.timestamp < pool.date[1]) return PoolState.Open;
        if ( pool.balance[1] <  pool.limit[0] )return PoolState.Closed;
        return block.timestamp < pool.date[2] ? PoolState.Running : PoolState.Settled;
    }

    /**
     * @dev Does pool exist?
     * @param pool Pool data
     * @return boolean true if pool exists, false otherwise
     */
    function _exists(PoolData memory pool) internal pure  returns (bool) {
        return pool.price > 0;
    }

    /**
     * @dev Can user invest funds?
     * @param pool Pool data
     * @return boolean true user can invest funds, false otherwise
     */
    function _canUserInvest(PoolData memory pool) internal view returns (bool) {
        return _getPoolState(pool) == PoolState.Open;
    }

    /**
     * @dev Can user withdraw previously invested funds?
     * @param pool Pool data
     * @return boolean true if user can withdraw funds, false otherwise
     */
    function _canUserWidthdraw(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
        return  state == PoolState.Open || state == PoolState.Closed;
    }

    /**
     * @dev Can user redeem previously invested funds?
     * @param pool Pool data
     * @return boolean true user can redeem investments, false otherwise
     */
    function _canUserRedeem(PoolData memory pool) internal view returns (bool) {
        return _getPoolState(pool) == PoolState.Settled;
    }

    /**
     * @dev Can operator withdraw invested funds?
     * @param pool Pool data
     * @return boolean true if operator can withdraw invested funds, false otherwise
     */
    function _canOperatorWidthdraw(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
       // printState(pool);
       // console.log( pool.balance[0],pool.balance[1],pool.balance[2]);
       
        return  state == PoolState.Running && pool.balance[2] > 0;
    }

    /**
     * @dev Can operator deposit investment returns?
     * @param pool Pool data
     * @return boolean true if operator can deposit invested funds with returns, false otherwise
     */
     function _canOperatorDeposit(PoolData memory pool) internal view returns (bool) {
        PoolState state = _getPoolState(pool);
        return  (state == PoolState.Running || state == PoolState.Settled);
    }

    /**
     * @dev Calculate user investment base and quote token amounts
     * @param pool Pool data
     * @param amountQuoteIn Requested quote token amount
     * @return amountBase Base token amount
     * @return amountQuote Quote token amount
     */
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

    /**
     * @dev Calculate operator withdrawal amount
     * @param pool Pool data
     * @return uint256 Amount of quote tokens that operator can withdraw
     */
    function _getOperatorWithdrawalAmount( PoolData memory pool ) internal pure returns (uint256) {
       return pool.balance[2];
    }

    /**
     * @dev Calculate operator deposit amount
     * @param pool Pool data
     * @param amount Requested quote token amount to deposit
     * @return uint256 Amount of quote tokens that operator can deposit
    */
    function _getOperatorDepositAmount( PoolData memory pool, uint256 amount ) internal pure returns(uint256) {
        uint256 maxDeposit = pool.balance[0].sub(pool.balance[2]);
        return maxDeposit < amount ? maxDeposit : amount;
    }

    /**
     * @dev Calculate user withdrawal amount
     * @param pool Pool data
     * @param amountBaseIn Requested base token amount
     * @return amountBase Base token amount
     * @return amountQuote Quote token amount
     */
    
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

    /**
     * @dev Calculate quote token amount from base token amount
     * @param pool Pool data
     * @param amountBase Base token amount
     *  @return uint256 Amount of quote tokens corrisponding to amountBase base tokens
     */
    function _calculateAmountQuote(PoolData memory pool, uint256 amountBase) internal pure returns (uint256) {
        return FullMath.mulDiv(amountBase, PRICE_DENOMINATOR, pool.price );  
    }
    
    /**
     * @dev Update pool instance after user investment operation
     * @param pool Pool data
     * @param amountBase Base token amount
     * @param amountQuote Quote token amount
     * @return PoolData Updated Pool data structure
     */
    function _onUserInvest( PoolData memory pool, uint256 amountBase, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[0] = amountBase.add(pool.balance[0]);
        pool.balance[1] = amountQuote.add(pool.balance[1]);
        pool.balance[2] = amountQuote.add(pool.balance[2]);
        return pool;
    }

    /**
     * @dev Update pool instance after user withdrawal operation
     * @param pool Pool data
     * @param amountBase Base token amount
     * @param amountQuote Quote token amount
     * @return PoolData Updated Pool data structure
     */
    function _onUserWithdraw( PoolData memory pool, uint256 amountBase, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[0] = pool.balance[0].sub(amountBase);
        pool.balance[1] = pool.balance[1].sub(amountQuote);
        pool.balance[2] = pool.balance[2].sub(amountQuote);
        return pool;
    }

    /**
     * @dev Update pool instance after user redeem operation
     * @param pool Pool data
     * @param amountBase Base token amount
       * @return PoolData Updated Pool data structure
     */
    function _onUserRedeem( PoolData memory pool, uint256 amountBase ) internal pure returns (PoolData memory) {
        pool.balance[0] = pool.balance[0].sub(amountBase);
        pool.balance[2] = pool.balance[2].sub(amountBase);
        return pool;
    }

    /**
     * @dev Update pool instance after operator withdrawal operation
     * @param pool Pool data
     * @param amountQuote Quote token amount
     * @return PoolData Updated Pool data structure
     */
    function _onOperatorWithdraw( PoolData memory pool, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[2] = pool.balance[2].sub(amountQuote);
        return pool;
    } 

    /**
     * @dev Update pool instance after operator deposit operation
     * @param pool Pool data
     * @param amountQuote Quote token amount
     * @return PoolData Updated Pool data structure
     */
    function _onOperatorDeposit( PoolData memory pool, uint256 amountQuote ) internal pure returns (PoolData memory) {
        pool.balance[2] = amountQuote.add(pool.balance[2]);
        return pool;
    }    

}
