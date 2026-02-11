// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PsiExperiment {
    struct Experiment {
        string experimentId;
        address participant;
        bytes32 targetHash;
        bytes32 responseHash;
        string responseIpfsHash;
        uint256 score; // Stored as percentage * 100 (e.g., 7500 = 75.00%)
        uint256 timestamp;
        bool responseSubmitted;
        bool revealed;
    }

    mapping(string => Experiment) public experiments;
    mapping(address => string[]) public userExperiments;
    string[] public allExperimentIds;

    event ExperimentCreated(
        string indexed experimentId,
        address indexed participant,
        bytes32 targetHash,
        uint256 timestamp
    );

    event ResponseSubmitted(
        string indexed experimentId,
        address indexed participant,
        bytes32 responseHash,
        string responseIpfsHash,
        uint256 timestamp
    );

    event TargetRevealed(
        string indexed experimentId,
        address indexed participant,
        bytes32 targetHash,
        uint256 score,
        uint256 timestamp
    );

    function createExperiment(
        string memory _experimentId,
        bytes32 _targetHash
    ) public {
        require(experiments[_experimentId].timestamp == 0, "Experiment ID already exists");

        experiments[_experimentId] = Experiment({
            experimentId: _experimentId,
            participant: msg.sender,
            targetHash: _targetHash,
            responseHash: bytes32(0),
            responseIpfsHash: "",
            score: 0,
            timestamp: block.timestamp,
            responseSubmitted: false,
            revealed: false
        });

        userExperiments[msg.sender].push(_experimentId);
        allExperimentIds.push(_experimentId);

        emit ExperimentCreated(_experimentId, msg.sender, _targetHash, block.timestamp);
    }

    function submitResponse(
        string memory _experimentId,
        bytes32 _responseHash,
        string memory _responseIpfsHash
    ) public {
        Experiment storage exp = experiments[_experimentId];

        require(exp.timestamp > 0, "Experiment does not exist");
        require(exp.participant == msg.sender, "Not the experiment participant");
        require(!exp.responseSubmitted, "Response already submitted");

        exp.responseHash = _responseHash;
        exp.responseIpfsHash = _responseIpfsHash;
        exp.responseSubmitted = true;

        emit ResponseSubmitted(
            _experimentId,
            msg.sender,
            _responseHash,
            _responseIpfsHash,
            block.timestamp
        );
    }

    function revealAndScore(
        string memory _experimentId,
        bytes32 _targetHashConfirmation,
        uint256 _score
    ) public {
        Experiment storage exp = experiments[_experimentId];

        require(exp.timestamp > 0, "Experiment does not exist");
        require(exp.participant == msg.sender, "Not the experiment participant");
        require(exp.responseSubmitted, "Response not submitted yet");
        require(!exp.revealed, "Already revealed");
        require(exp.targetHash == _targetHashConfirmation, "Target hash mismatch");

        exp.score = _score;
        exp.revealed = true;

        emit TargetRevealed(
            _experimentId,
            msg.sender,
            _targetHashConfirmation,
            _score,
            block.timestamp
        );
    }

    function getExperiment(string memory _experimentId)
        public
        view
        returns (
            string memory experimentId,
            address participant,
            bytes32 targetHash,
            bytes32 responseHash,
            string memory responseIpfsHash,
            uint256 score,
            uint256 timestamp,
            bool responseSubmitted,
            bool revealed
        )
    {
        Experiment memory exp = experiments[_experimentId];
        return (
            exp.experimentId,
            exp.participant,
            exp.targetHash,
            exp.responseHash,
            exp.responseIpfsHash,
            exp.score,
            exp.timestamp,
            exp.responseSubmitted,
            exp.revealed
        );
    }

    function getUserExperiments(address _user)
        public
        view
        returns (string[] memory)
    {
        return userExperiments[_user];
    }

    function getAllExperiments()
        public
        view
        returns (string[] memory)
    {
        return allExperimentIds;
    }

    function getTotalExperiments() public view returns (uint256) {
        return allExperimentIds.length;
    }
}
