const sanitizeHtml = require('sanitize-html');

const Proposal = require('../models/proposal');
const User = require('../models/user');

const ObjectId = require('mongoose').Types.ObjectId;

// Función para eliminar acentos
function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const createProposal = async (req, res) => {
    try {
        const newProposal = new Proposal(req.body);
        await newProposal.save();
        res.status(201).json(newProposal);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

const getProposals = async (req, res) => {
    const searchQuery = normalizeString(req.query.search) || '';
    const filterCategories = req.query.categories || [];

    // Construir la consulta
    const query = {
        isDraft: false
    };

    // Si hay categorías en filterCategories, agregarlas a la consulta
    if (filterCategories.length > 0) {
        query.categories = { $in: filterCategories };
    }

    try {
        // Buscar todos los documentos, luego filtrar manualmente
        const rawProposals = await Proposal.find(query);

        // Normalizar los títulos y descripciones antes de hacer la comparación
        const filteredProposals = rawProposals.filter(p => {
            const normalizedTitle = normalizeString(p.title.toLowerCase());
            const normalizedDescription = normalizeString(p.description.toLowerCase());

            return (
                normalizedTitle.includes(searchQuery.toLowerCase()) ||
                normalizedDescription.includes(searchQuery.toLowerCase())
            );
        });

        // Obtener supporters usando async/await
        const proposals = await Promise.all(
            filteredProposals.map(async (p) => {
                return {
                    ...p.toObject(),
                    supporters: await p.getSupportersCount(),
                };
            })
        );

        res.status(200).render('fragments/proposalCards', { layout: false, proposals });
    } catch (error) {
        console.error("Error en la búsqueda:", error);
        res.status(404).json({ message: error.message });
    }
}

const getProposal = async (req, res) => {
    try {
        const proposal = await Proposal.findById(new ObjectId(req.params.id));
        proposal.supporters = await proposal.getSupportersCount();

        res.status(200).render('fragments/proposalDetailModal', { layout: false, proposal });
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
        const rawProposal = await Proposal
            .findById(new ObjectId(proposalId));
        if (!rawProposal) {
            console.error(`Propuesta ${proposalId} para el usuario ${req.session.user.id}.`)
            req.toastr.error("Propuesta no encontrada.");
            return res.status(409).render('fragments/toastr', { layout: false, req: req });
        }

        const user = req.session.user

        if (user.supportedProposals.includes(rawProposal.id)) {
            console.warn(`El usuario ${req.session.user.id} ya apoya la propuesta ${proposalId}.`)
            req.toastr.warning("Ya estás apoyando esta propuesta.");
            return res.status(409).render('fragments/toastr', { layout: false, req: req });
        }

        user.supportedProposals.push(rawProposal.id);
        await user.save();

        const proposal = {
            ...rawProposal.toObject(),
            supporters: await rawProposal.getSupportersCount()
        }

        res.locals.user = req.session.user;
        res.status(200).render('fragments/proposalCard', { layout: false, proposal });
    } catch (error) {
        console.error(error.message)
        req.toastr.error("Por favor, inténtalo más tarde", 'Ha ocurrido un error inesperado.');
        return res.status(500).render('fragments/toastr', { layout: false, req: req });
    }
}

const removeSupporter = async (req, res) => {
    try {
        const proposalId = req.params.id;
        const rawProposal = await Proposal
            .findById(new ObjectId(proposalId));
        if (!rawProposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const user = req.session.user

        if (!user.supportedProposals.includes(rawProposal.id)) {
            return res.status(409).json({ message: 'User does not support this proposal' });
        }

        user.supportedProposals.splice(user.supportedProposals.indexOf(new ObjectId(rawProposal.id)), 1);
        await rawProposal.save();
        await user.save();

        const proposal = {
            ...rawProposal.toObject(),
            supporters: await rawProposal.getSupportersCount()
        }

        res.locals.user = req.session.user;
        res.status(200).render('fragments/proposalCard', { layout: false, proposal });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getDraftForm = (req, res) => {
    res.status(200).render('fragments/proposalDraftModal', { layout: false });
}

const sendProposalAsDraft = async (req, res) => {
    const sanitizedDescription = sanitizeHtml(req.body.description, {
        allowedTags: ['b', 'i', 'u', 'ul', 'ol', 'li'],
        allowedAttributes: {}
    });

    try {
        const proposalData = {
            title: sanitizeHtml(req.body.title, {allowedTags: [], allowedAttributes: {}}),
            description: sanitizedDescription,
            categories: req.body.categories,
            isDraft: true,
            usersDrafting: req.session.user.id,
        }

        const newProposal = new Proposal(proposalData);
        newProposal.save();
    } catch (error) {
        console.log(error);
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
        let userProposing = new Set();
        let deleteProposals = req.body.deleteProposals;
        for (let proposalId of deleteProposals) {
            const proposal = await proposal.findById(proposalId);
            userProposing.add(proposal.usersDrafting);
            await proposal.findByIdAndDelete(proposalId);
        }
        const newProposal = new proposal(req.body);
        newProposal.isDraft = false;
        newProposal.usersDrafting = userProposing;
        await newProposal.save();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createProposal,
    getProposals,
    getProposal,
    deleteProposal,
    getProposalByCategory,
    getProposalsCategories,
    addSupporter,
    removeSupporter,
    getDraftForm,
    sendProposalAsDraft,
    getDraftProposals,
    deleteDraftProposal,
    approveDraftProposal
}