module ufc_strike::moments_manager {
    use std::signer;
    use aptos_framework::object;
    use std::string::String;
    use aptos_token_objects::aptos_token;

    // Events
    #[event]
    struct MomentMinted has drop, store {
        creator: address,
        payer: address,
        collection: String,
        moment_name: String,
        moment_id: address,
    }

    #[event]
    struct MomentTransferred has drop, store {
        creator: address,
        payer: address,
        recipient: address,
        moment_id: address,
    }

    #[event]
    struct MomentMintedAndTransferred has drop, store {
        creator: address,
        payer: address,
        recipient: address,
        collection: String,
        moment_name: String,
        moment_id: address,
    }

    // Mint moment function that requires both payer and creator to sign
    public entry fun mint__moment(
        payer: &signer,
        creator: &signer,
        collection: String,
        description: String,
        moment_name: String,
        moment_uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>
    ) {
        let payer_addr = signer::address_of(payer);
        let creator_addr = signer::address_of(creator);

        // Mint the moment using the creator's signer (payer pays for gas)
        let moment_id = aptos_token::mint_token_object(
            creator,
            collection,
            description,
            moment_name,
            moment_uri,
            property_keys,
            property_types,
            property_values,
        );

        let moment_addr = object::object_address(&moment_id);

        // Emit event for tracking
        aptos_framework::event::emit(MomentMinted {
            creator: creator_addr,
            payer: payer_addr,
            collection,
            moment_name,
            moment_id: moment_addr,
        });
    }

    // Mint and transfer in a single transaction
    public entry fun mint_and_transfer_moment(
        payer: &signer,
        creator: &signer,
        collection: String,
        description: String,
        moment_name: String,
        moment_uri: String,
        property_keys: vector<String>,
        property_types: vector<String>,
        property_values: vector<vector<u8>>,
        recipient: address
    ) {
        let payer_addr = signer::address_of(payer);
        let creator_addr = signer::address_of(creator);

        // Step 1: Mint the moment using the creator's signer
        let moment_id = aptos_token::mint_token_object(
            creator,
            collection,
            description,
            moment_name,
            moment_uri,
            property_keys,
            property_types,
            property_values,
        );

        // Step 2: Transfer the moment to recipient
        aptos_framework::object::transfer(creator, moment_id, recipient);


        let moment_addr = object::object_address(&moment_id);

        // Emit event for tracking
        aptos_framework::event::emit(MomentMintedAndTransferred {
            creator: creator_addr,
            payer: payer_addr,
            recipient,
            collection,
            moment_name,
            moment_id: moment_addr,
        });
    }

    // // Transfer moment function that requires both payer and owner to sign
    public entry fun transfer__moment(
        payer: &signer,
        owner: &signer,
        moment_id: address,
        recipient: address
    ) {
        let payer_addr = signer::address_of(payer);
        let owner_addr = signer::address_of(owner);

        let moment = object::address_to_object<aptos_token::AptosToken>(moment_id);
        // Transfer the moment using the owner's signer (payer pays for gas)
        aptos_framework::object::transfer(owner, moment, recipient);

        // Emit event for tracking
        aptos_framework::event::emit(MomentTransferred {
            creator: owner_addr,
            payer: payer_addr,
            recipient,
            moment_id,
        });
    }
} 