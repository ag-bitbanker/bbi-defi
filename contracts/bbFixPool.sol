// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {bbFix} from "./bbFix.sol";
import {ERC1155Receiver} from "./ERC1155Receiver.sol";
import {Pool, PoolData, PoolState, InvalidParameters} from './Pool.sol';

error InvalidBalance();
error InvalidAmount();
error InvalidOperation();
error InvalidToken();

contract bbFixPool is ERC1155Receiver, Pool, AccessControl {
    // operator (trader)
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    // base token (bbFix)
    bbFix public baseToken;
    // quote token (stable coin)
    ERC20 public quoteToken;
    /**
     * @dev Pool constructor
     * @param base Base token address
     * @param quote Quote token address
     * @param defaultAdmin Initial admin wallet address
     */
    constructor(address base, address quote, address defaultAdmin) {
        if (
            base == address(0) ||
            quote == address(0) ||
            defaultAdmin == address(0) ||
            base == quote
        ) {
            revert InvalidParameters();
        }
        baseToken = bbFix(base);
        quoteToken = ERC20(quote);
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }
    /**
     * @dev Create pool with given parameters
     * @notice Only signer with OPERATOR_ROLE granted
     * @param tokenId Token OD
     * @param price base/quote tokeen initial exchange rate
     * @param openDate when fund conlection start
     * @param openDate when fund conlection stops
     * @param settleDate when investment will be matured
     * @param minAmount min amount of quote token to be collected
     * @param maxAmount max amount of quote token to be collected
     */
    function createPool(
        uint256 tokenId,
        uint256 price,
        uint256 openDate,
        uint256 closeDate,
        uint256 settleDate,
        uint256 minAmount,
        uint256 maxAmount

    ) public onlyRole(OPERATOR_ROLE) {
        
        if ( _exists( _getPool(tokenId))) revert InvalidToken();

       _update(tokenId, _createPool(
            price,
            openDate,
            closeDate,
            settleDate,
            minAmount,
            maxAmount
        ));
    }

    function getPoolAccumulatedFunds(uint256 tokenId) public view returns (uint256 amount) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        (, amount, ) = _getBalances(pool);
    }

    /**
     * @dev Pool balances
     * @param tokenId Token ID
     * @return amountBase Base tokeen amount minted
     * @return amountQuote Quote token amount in pool
     * @return amountQuoteLocked Quote token amount owned by contract
     */
    function getBalances(uint256 tokenId) public view returns (uint256 amountBase, uint256 amountQuote, uint256 amountQuoteLocked) {
         PoolData memory pool = _getPool(tokenId);
          if ( !_exists(pool)) revert InvalidToken();
        (amountBase,amountQuote,amountQuoteLocked) = _getBalances(pool);
    }

    /**
     * @dev Pool limits
     * @param tokenId Token ID
     * @return min Min amount of quote token to be collected
     * @return max Max amount of quote token to be collected
     */
    function getLimits(uint256 tokenId) public view returns (uint256 min, uint256 max) {
         PoolData memory pool = _getPool(tokenId);
          if ( !_exists(pool)) revert InvalidToken();
        (min,max) = _getLimits(pool);
    }
    /**
     * @dev Can user invest funds?
     * @param tokenId Token ID
     * @return boolean true user can invest funds, false otherwise
     */
    function canInvest(uint256 tokenId) public view returns (bool) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        return _canUserInvest(pool);
    }

    /**
     * @dev Can user withdraw previously invested funds?
     * @param tokenId Token ID
     * @return boolean true if user can withdraw funds, false otherwise
     */
    function canWidthdraw(uint256 tokenId) public view returns (bool) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        return _canUserWidthdraw(pool);
    }

    /** 
     * @dev Can user redeem previously invested funds?
     * @param tokenId Token ID
     * @return boolean true user can redeem investments, false otherwise
     */
    function canRedeem(uint256 tokenId) public view returns (bool) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        return _canUserRedeem(pool);
    }

    /**
     * @dev Calculate quote token amount from base token amount
     * @param tokenId Token ID
     * @param amountBase Base token amount
     * @return uint256 Amount of quote tokens corrisponding to amountBase base tokens
     */
    function calculateAmountQuote(uint256 tokenId, uint256 amountBase) public view returns (uint256) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        return _calculateAmountQuote(pool, amountBase);
    }

    /**
     * @dev Withdraw collected funds
     * @notice Only signer with OPERATOR_ROLE granted
     * @param tokenId Token OD
     */
    function operatorWithdraw(uint256 tokenId) public onlyRole(OPERATOR_ROLE) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        if ( !_canOperatorWidthdraw(pool)) revert InvalidOperation();
        uint256 amount = _getOperatorWithdrawalAmount(pool);
        if ( amount == 0) revert InvalidBalance();
        // transfer all accumulated quote tokens from contract to operator
        quoteToken.transfer(msg.sender, amount);
        _update(tokenId, _onOperatorWithdraw(pool,amount));
        
    }

    /**
     * @dev Deposit collected funds with investment returns
     * @notice Only signer with OPERATOR_ROLE granted
     * @param tokenId Token OD
     * @param amount Quote token amount to deposit 
     */
    function operatorDeposit(
        uint256 tokenId,
        uint256 amount
    ) public onlyRole(OPERATOR_ROLE) {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        if ( !_canOperatorDeposit(pool)) revert InvalidOperation();
        uint256 amountIn = _getOperatorDepositAmount(pool, amount);
         if ( amountIn == 0) revert InvalidBalance();
        // console.log('operatorDeposit', amount,amountIn);
        // transfer quote tokens from opeerator to contract
        quoteToken.transferFrom(msg.sender, address(this), amountIn);
        pool = _onOperatorDeposit(pool,amountIn);
        _update(tokenId, pool);
    }


    /**
     * @dev Invest funds 
     * @param tokenId Token ID
     * @param amount Quote token amount to invest 
     */
    function invest(uint256 tokenId, uint256 amount) public {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        if (!_canUserInvest(pool)) revert InvalidOperation();
        (uint256 amountBase, uint256 amountQuote ) = _getUserInvestmentAmounts(pool, amount);
        if (amountBase == 0 && amountQuote == 0 ) revert InvalidAmount();
        quoteToken.transferFrom(msg.sender, address(this), amountQuote);
        baseToken.mint(msg.sender, tokenId, amountBase, "0x");
        pool = _onUserInvest(pool,amountBase,amountQuote);
        _update(tokenId, pool);
     }

    /**
     * @dev Withdraw funds 
     * @param tokenId Token ID
     * @param amount Quote token amount to withdraw 
     */
    function withdraw(uint256 tokenId, uint256 amount) public {
        PoolData memory pool = _getPool(tokenId);
        if ( !_exists(pool)) revert InvalidToken();
        if (!_canUserWidthdraw(pool)) revert InvalidOperation();
        if ( amount == 0 || amount > baseToken.balanceOf(msg.sender, tokenId)) revert InvalidAmount();
        (uint256 amountBase, uint256 amountQuote ) = _getUserWithdrawalAmount(pool,amount);
        // console.log('withdraw', amount, amountBase, amountQuote);
        if (amountBase == 0 || amountQuote == 0 ) revert InvalidAmount();
        // burn tokens
        baseToken.burn(msg.sender, tokenId, amountBase);
         // transfer quote token from contract to sender
        quoteToken.transfer(msg.sender, amount);

        pool = _onUserWithdraw(pool, amountBase, amountQuote);
         _update(tokenId, pool);

    }

    /**
     * @dev Redeem investments 
     * @param tokenId Token ID
     */
    function redeem(uint256 tokenId) public {
        PoolData memory pool = _getPool(tokenId);
         if ( !_exists(pool)) revert InvalidToken();
        if (!_canUserRedeem(pool)) revert InvalidOperation();
        // amount to redeem. 1:1 to base tokeen balance of sender
        uint256 amount = baseToken.balanceOf(msg.sender, tokenId);
        if (amount == 0 || amount > pool.balance[0]) revert InvalidBalance();
        // burn tokens
        baseToken.burn(msg.sender, tokenId, amount);
        // transfer quote token from contract to sender
        quoteToken.transfer(msg.sender, amount);

        pool = _onUserRedeem(pool, amount);
        _update( tokenId, pool);

    }   
    
}
