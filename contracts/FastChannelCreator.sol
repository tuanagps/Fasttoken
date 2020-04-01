
pragma solidity ^0.5.0;

import './Fasttoken.sol';
import './FastChannel.sol';


contract FastChannelCreator { //Fabric function

        uint16 public constant VERSION = 1;
        function createNew(address casino, address creator, Fasttoken token)
                public
                returns(address) {

                return address(new FastChannel(casino, creator, token)); //Could be poker channel or globbing channel
        }
}
