
pragma solidity ^0.5.0;

import './Fasttoken.sol';
import './FastChannelV2.sol';


contract FastChannelV2Creator { //Fabric function

        uint16 public constant VERSION = 2;

        function createNew(address casino, address creator, Fasttoken token)
                public
                returns(address) {

                return address(new FastChannelV2(casino, creator, token)); //Could be poker channel or globbing channel
        }
}
