// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {bbFix} from "../bbFix.sol";

contract bbFixMock is bbFix {
    
    event return$_grantRole(bool);
    event return$_revokeRole(bool);

    constructor(address defaultAdmin, address operator, string memory url)
        bbFix(defaultAdmin, operator, url)
    {}

    // internal functions
    function $_setRoleAdmin(bytes32 role, bytes32 adminRole) public {
        _setRoleAdmin(role, adminRole);
    }

    function $_grantRole(bytes32 role, address account) public returns(bool) {
        bool result = _grantRole(role, account);
        emit return$_grantRole(result);
        return result;
    }

    function $_checkRole(bytes32 role) public view virtual {
        _checkRole(role);
    }

    function $_checkRole(bytes32 role, address account) public view {
        _checkRole(role, account);
    }

    function $_revokeRole(bytes32 role, address account) public returns(bool) {
        bool result = _revokeRole(role, account);
        emit return$_revokeRole(result);
        return result;
    }
}