#[test_only]
module ufc_packs::digital_asset_collection_test {
    use std::signer;
    use std::string;
    use std::option;
    use std::vector;
    use aptos_framework::object;
    use aptos_framework::account;
    use aptos_token_objects::aptos_token;
    use aptos_token_objects::collection;
    use aptos_token_objects::collection::Collection;
    use aptos_std::debug;
    use aptos_std::event;

    // Collection configuration constants
    const COLLECTION_NAME: vector<u8> = b"UFC Champions";
    const COLLECTION_DESCRIPTION: vector<u8> = b"Collection of UFC Champion NFTs";
    const COLLECTION_URI: vector<u8> = b"https://ufc.com/collection";

    #[test(aptos_framework = @aptos_framework, creator = @ufc_packs)]
    fun test_create_collection(
        aptos_framework: &signer,
        creator: &signer,
    ) {
        // ================================= Setup ================================== //
        
        let creator_addr = signer::address_of(creator);
        account::create_account_for_test(creator_addr);

        // ================================= Create Collection ================================== //

        let collection_name = string::utf8(COLLECTION_NAME);
        let collection_description = string::utf8(COLLECTION_DESCRIPTION);
        let collection_uri = string::utf8(COLLECTION_URI);
        let max_supply = 3; // Maximum supply for the collection
        let mutable_description = true;
        let mutable_royalty = false;
        let mutable_uri = true;
        let mutable_token_description = true;
        let mutable_token_name = false;
        let mutable_token_properties = true;
        let mutable_token_uri = true;
        let tokens_burnable_by_creator = true;
        let tokens_freezable_by_creator = false;
        let royalty_numerator = 0;
        let royalty_denominator = 100;

         aptos_token::create_collection(
            creator,
            collection_description,
            max_supply,
            collection_name,
            collection_uri,
            mutable_description,
            mutable_royalty,
            mutable_uri,
            mutable_token_description,
            mutable_token_name,
            mutable_token_properties,
            mutable_token_uri,
            tokens_burnable_by_creator,
            tokens_freezable_by_creator,
            royalty_numerator,
            royalty_denominator
        );

        // ================================= Create Token Data ================================== //
 

        let token_description = string::utf8(b"Notorious Conor McGregor NFT");
        let token_uri = string::utf8(b"https://ufc.com/fighters/conor-mcgregor");
        let property_keys = vector::empty<string::String>();
        let property_types = vector::empty<string::String>();
        let property_values = vector::empty<vector<u8>>();

        // ================================= Mint Token ================================== //
        
        let token_id_1 = aptos_token::mint_token_object(
            creator,
            collection_name,
            token_description,
            collection_name,
            token_uri,
            property_keys,
            property_types,
            property_values,
        );

        let token_id_2 = aptos_token::mint_token_object(
            creator,
            collection_name,
            token_description,
            collection_name,
            token_uri,
            property_keys,
            property_types,
            property_values,
        );

        let token_id_3 = aptos_token::mint_token_object(
            creator,
            collection_name,
            token_description,
            collection_name,
            token_uri,
            property_keys,
            property_types,
            property_values,
        );

        debug::print(&string::utf8(b"3 Tokens minted successfully!"));
        debug::print(&token_id_1);
        debug::print(&token_id_2);
        debug::print(&token_id_3);
 
         let collection_address = collection::create_collection_address(&creator_addr, &collection_name);
         let collection = object::address_to_object<Collection>(collection_address);
         debug::print(&collection);
         let name = collection::name(collection);
         let description = collection::description(collection);
         let uri = collection::uri(collection);
         let count = collection::count(collection);
         
         debug::print(&string::utf8(b"=== COLLECTION DETAILS ==="));
         debug::print(&string::utf8(b"Collection object:"));
         debug::print(&collection);
         debug::print(&string::utf8(b"Collection name:"));
         debug::print(&name);
         debug::print(&string::utf8(b"Collection description:"));
         debug::print(&description);
         debug::print(&string::utf8(b"Collection URI:"));
         debug::print(&uri);
         debug::print(&string::utf8(b"Supply:"));
         debug::print(&count);
         debug::print(&string::utf8(b"========================"));
    }
} 