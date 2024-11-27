// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {bbFix} from "./bbFix.sol";

error InvalidParameters();
error InvalidBalance();
error InvalidOperation();
error InvalidToken();

struct Pool {
    uint256 price;                  // initial base token price, valid for [investmentStartDate,investmenEndDate]
    uint256 investmentStartDate;    // accept deposits starting from this date     
    uint256 investmenEndDate;       // last date to deposit funds
    uint256 settlementDate;         // withdrawals will be enabled starting from settlementDate
    uint256 lowWatermark;           // min base token amount to be collected to start investments
    uint256 highWatermark;          // min base token amount to collect
    uint256 balance;                // quote token balance
    uint256 supply;                 // base token supply
}

contract bbFixPool is AccessControl {
    // operator (trader)
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    // price precision
    uint256 constant public DENOMINATOR  = 10**18; 
    // base token (bbFix)
    bbFix public baseToken;
    // quote token (stable coin)
    ERC20 public quoteToken;
    
    mapping(uint256 tokenId => Pool ) public pools;

    constructor(address base, address quote)
    {
        if ( base == address(0) || quote == address(0) || base == quote) {
            revert InvalidParameters();
        }
        baseToken = bbFix(base);
        quoteToken = ERC20(quote);
    }


    function createPool(uint256 tokenId, uint256 price, uint256 investmentStartDate, uint256 investmenEndDate, uint256 settlementDate, uint256 lowWatermark, uint256 highWatermark) onlyRole(OPERATOR_ROLE) public  {
        if ( investmentStartDate >= investmenEndDate || investmenEndDate >= settlementDate|| lowWatermark < highWatermark || price == 0 || price >= DENOMINATOR ) {
            revert InvalidParameters();
        }
        Pool memory pool = Pool(price, investmentStartDate, investmenEndDate, settlementDate, lowWatermark, highWatermark, 0, 0);
        pools[tokenId] = pool; 
    }

    function canInvest( uint256 tokenId) public view returns(bool) {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        return _canInvest(pool);
    }

    function canWidthdraw( uint256 tokenId) public view returns(bool) {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        return _canWidthdraw(pool);
    }

    function canRedeem( uint256 tokenId) public view returns(bool) {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        return _canRedeem(pool);
    }

    function withdrawFunds(uint256 tokenId) onlyRole(OPERATOR_ROLE) public  {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        if ( pool.investmenEndDate < block.timestamp) {
            revert InvalidOperation();
        }
        if ( pool.supply < pool.lowWatermark) {
            revert InvalidBalance();
        }
        // transfer all accumulated balance to operator
        quoteToken.transfer(msg.sender,pool.balance);
        pool.balance = 0;
        // store in blockchain
        pools[tokenId] = pool;
    }

    function depositReturns(uint256 tokenId, uint256 amount) public onlyRole(OPERATOR_ROLE) {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        if ( pool.investmenEndDate < block.timestamp) {
            revert InvalidOperation();
        }
        if ( pool.balance + amount > pool.supply ) {
            amount = pool.supply - pool.balance;
        }
        // transfer quote tokens to contract
        quoteToken.transferFrom(msg.sender, address(this),amount);
        // adjust pool balance
        pool.balance += amount;
        // store in blockchain
        pools[tokenId] = pool;
    }

    function invest( uint256 tokenId, uint256 amount) public {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        if (!_canInvest(pool)) {
             revert InvalidOperation();
        }
        // calculate amount of base token
        uint256 amountBase = amount * pool.price / DENOMINATOR;
        if ( pool.supply + amountBase > pool.highWatermark ) {
            amountBase = pool.highWatermark - pool.supply;
        }
        // transfer quote token to contract
        quoteToken.transferFrom( msg.sender, address(this), amount);
        // adjust balance
        pool.balance += amount;
        // mint base token directly to sender
        baseToken.mint(msg.sender, tokenId, amountBase, '0x');
        // adjust supply
        pool.supply += amountBase;
        // store in blockchain
        pools[tokenId] = pool;
    }

    function redeem( uint256 tokenId) public {
        Pool memory pool = pools[tokenId];
        _checkPool(pool);
        if ( !_canRedeem( pool)) {
            revert InvalidOperation();
        }
        // amount to redeem. 1:1 to base tokeen balance of sender
        uint256 amount = baseToken.balanceOf(msg.sender,tokenId);
        if ( amount == 0 || amount > pool.balance) {
            revert InvalidBalance();
        }
        // transfer base token from sender to contract
        baseToken.safeTransferFrom(msg.sender,address(this), tokenId, amount, '0x');
        // contract is now owner of base token, burn it
        baseToken.burn(msg.sender,tokenId,amount);
        // adjust balance
        pool.balance -= amount;
        // transfer quote token from contract to sender
        quoteToken.transfer(msg.sender,amount);
        
        if ( pool.balance == 0) {
            // delete
            delete pools[tokenId];
        } else {
            // store in blockchain
            pools[tokenId] = pool;
        }
    }

    function _checkPool(Pool memory pool ) internal pure {
        if (  pool.price == 0) {
            revert InvalidToken();
        }
    }
    function _canInvest( Pool memory pool ) internal view returns(bool) {
        return pool.supply < pool.highWatermark && block.timestamp < pool.investmenEndDate && block.timestamp >= pool.investmentStartDate;
    }

    function _canWidthdraw(  Pool memory pool) internal view returns(bool) {
        return pool.balance > 0 && pool.supply < pool.lowWatermark && block.timestamp > pool.investmenEndDate;
    }

    function _canRedeem( Pool memory pool) internal view returns(bool) {
        return pool.balance > 0 && pool.supply >= pool.lowWatermark && block.timestamp > pool.settlementDate;
    }
    
}