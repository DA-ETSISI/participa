const proposal = require('../models/proposal');
const user = require('../models/user');

const createProposal = async (req, res) => {
    try {
        const newProposal = new proposal(req.body);
        await newProposal.save();
        res.status(201).json(newProposal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

const getProposals = async (req, res) => {
    try {
        const proposals = await proposal.find();
        res.status(200).json(proposals);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const deleteProposal = async (req, res) => {
    try {
        await proposal.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Proposal deleted' });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getProposalByCategory = async (req, res) => {
    try {
        const proposals = await proposal.find({ categories: req.params.category });
        res.status(200).json(proposals);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getProposalsCategories = async (req, res) => {
    try {
        const categories = await proposal.distinct('categories');
        res.status(200).json(categories);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const addSupporter = async (req, res) => {
    try {
        const proposalId = req.params.id;
        const proposal = await proposal
            .findById(proposalId)
            .select('supporters');
        
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const userId = req.body.userId;
        const user = await user
            .findOne({ _id: userId })
            .select('supportedProposals');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.supportedProposals.includes(proposalId)) {
            return res.status(409).json({ message: 'User already supports this proposal' });
        }
        proposal.supporters += 1;
        user.supportedProposals.push(proposalId);
        await proposal.save();
        res.status(200).json("New supporter added on proposal: " + proposalId);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const sendProposalAsDraft = async (req, res) => {
    try {
        const proposalData = req.body;
        proposalData.isDraft = true;
        proposalData.usersDrafting = [req.query.userId];
        const newProposal = new proposal(proposalData);
        newProposal.save();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getDraftProposals = async (req, res) => {
    try {
        const proposals = await proposal.find({ isDraft: true });
        res.status(200).json(proposals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteDraftProposal = async (req, res) => {
    try {
        await proposal.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Draft proposal deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const approveDraftProposal = async (req, res) => {
    try {
        const proposalId = req.params.id;
        const proposal = await proposal.findById(proposalId)
        proposal.isDraft = undefined;
        const usersDrafting = proposal.usersDrafting;
        usersDrafting.forEach(async (userId) => {
            const user = await user.findById(userId);
            user.supportedProposals.push(proposalId);
            user.save();
        });
        proposal.usersDrafting = undefined;
        proposal.save();
        res.status(200).json({ message: 'Draft proposal approved' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createProposal,
    getProposals,
    deleteProposal,
    getProposalByCategory,
    getProposalsCategories,
    addSupporter,
    sendProposalAsDraft,
    getDraftProposals,
    deleteDraftProposal,
    approveDraftProposal
}