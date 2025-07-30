#[test_only]
module ufc_strike::packs_manager_test {
    use std::signer;
    use std::string;
    use std::vector;
    use aptos_framework::account;
    use aptos_std::debug;
    use ufc_strike::packs_manager;
    use ufc_strike::moments_registry;
    use aptos_token_objects::aptos_token;
    use aptos_framework::object;

    // Test constants
    const TEST_COLLECTION_ID_1: u64 = 1;
    const TEST_COLLECTION_ID_2: u64 = 2;
    const TEST_COLLECTION_ID_3: u64 = 3;
    const TEST_WEIGHT_1: u64 = 50;
    const TEST_WEIGHT_2: u64 = 30;
    const TEST_WEIGHT_3: u64 = 20;
    const TEST_SUPPLY_1: u64 = 10;
    const TEST_SUPPLY_2: u64 = 5;
    const TEST_SUPPLY_3: u64 = 3;
    const TEST_RANDOMNESS: u64 = 42;

    // ================================= Helper Functions ================================== //

    /// Inicializa el registry de momentos (sin crear cuenta)
    fun setup_creator_and_registry(creator: &signer) {
        moments_registry::init_registry(creator);
    }

    /// Registra momentos de prueba en el registry
    fun register_test_moments(creator: &signer) {
        // Register moment 1
        moments_registry::register_moment(
            creator,
            TEST_COLLECTION_ID_1,
            string::utf8(b"Conor McGregor vs Khabib"),
            string::utf8(b"Epic lightweight championship fight"),
            string::utf8(b"https://ufc.com/moments/conor-khabib"),
        );

        // Register moment 2
        moments_registry::register_moment(
            creator,
            TEST_COLLECTION_ID_2,
            string::utf8(b"Jon Jones vs Daniel Cormier"),
            string::utf8(b"Light heavyweight championship"),
            string::utf8(b"https://ufc.com/moments/jones-cormier"),
        );

        // Register moment 3
        moments_registry::register_moment(
            creator,
            TEST_COLLECTION_ID_3,
            string::utf8(b"Anderson Silva vs Chris Weidman"),
            string::utf8(b"Middleweight championship upset"),
            string::utf8(b"https://ufc.com/moments/silva-weidman"),
        );
    }

    /// Crea un drop pool con la configuración dada
    fun create_drop_pool(
        creator: &signer,
        collection_ids: vector<u64>,
        weights: vector<u64>,
        supplies: vector<u64>
    ) {
        packs_manager::init_drop_pool(
            creator,
            collection_ids,
            weights,
            supplies,
        );
    }

    /// Crea un drop pool estándar con 3 momentos
    fun create_standard_drop_pool(creator: &signer) {
        let listing_ids = vector::empty<u64>();
        let weights = vector::empty<u64>();
        let supplies = vector::empty<u64>();

        // Add moment 1
        vector::push_back(&mut listing_ids, TEST_COLLECTION_ID_1);
        vector::push_back(&mut weights, TEST_WEIGHT_1);
        vector::push_back(&mut supplies, TEST_SUPPLY_1);

        // Add moment 2
        vector::push_back(&mut listing_ids, TEST_COLLECTION_ID_2);
        vector::push_back(&mut weights, TEST_WEIGHT_2);
        vector::push_back(&mut supplies, TEST_SUPPLY_2);

        // Add moment 3
        vector::push_back(&mut listing_ids, TEST_COLLECTION_ID_3);
        vector::push_back(&mut weights, TEST_WEIGHT_3);
        vector::push_back(&mut supplies, TEST_SUPPLY_3);

        create_drop_pool(creator, listing_ids, weights, supplies);
    }

    /// Crea un usuario de prueba y devuelve el signer (sin crear cuenta)
    fun create_test_user(user_addr: address): signer {
        account::create_signer_with_capability(
            &account::create_test_signer_cap(user_addr)
        )
    }

    /// Setup completo: registry, momentos y drop pool (sin crear cuentas)
    fun setup_complete_test_environment(creator: &signer) {
        setup_creator_and_registry(creator);
        register_test_moments(creator);
        create_standard_drop_pool(creator);
    }

    // ================================= Tests ================================== //


    #[test(aptos_framework = @aptos_framework, creator = @ufc_strike)]
    fun test_init_drop_pool(
        creator: &signer,
    ) {
        // ================================= Setup ================================== //
        setup_creator_and_registry(creator);
        register_test_moments(creator);
        // ================================= Initialize Drop Pool ================================== //
        create_standard_drop_pool(creator);
        debug::print(&string::utf8(b"Drop pool initialized successfully!"));
        debug::print(&string::utf8(b"Total entries: 3"));
        debug::print(&string::utf8(b"Total weight: 100"));
    }

    #[test(aptos_framework = @aptos_framework, creator = @ufc_strike, user = @0x123)]
    fun test_open_pack_success(
        creator: &signer,
        user: &signer,
    ) {
        // ================================= Setup ================================== //
        setup_complete_test_environment(creator);
        
        // ================================= Mint NFT for User ================================== //
        let collection_name = string::utf8(b"UFC Packs Collection");
        let token_description = string::utf8(b"UFC Pack NFT - Can be opened to reveal a moment");
        let token_name = string::utf8(b"UFC Pack #1");
        let token_uri = string::utf8(b"https://ufc.com/packs/pack-1");
        
        // Create collection first
        aptos_token::create_collection(
            creator,
            token_description,
            100, // max_supply
            collection_name,
            token_uri,
            true,  // mutable_description
            false, // mutable_royalty
            true,  // mutable_uri
            true,  // mutable_token_description
            false, // mutable_token_name
            true,  // mutable_token_properties
            true,  // mutable_token_uri
            true,  // tokens_burnable_by_creator
            false, // tokens_freezable_by_creator
            0,     // royalty_numerator
            100    // royalty_denominator
        );
        
        // Mint the pack NFT
        let pack_token_id = aptos_token::mint_token_object(
            creator,
            collection_name,
            token_description,
            token_name,
            token_uri,
            vector::empty<string::String>(),
            vector::empty<string::String>(),
            vector::empty<vector<u8>>(),
        );
        
        // Transfer the pack NFT to the user
        let user_addr = signer::address_of(user);
        aptos_framework::object::transfer(creator, pack_token_id, user_addr);
        
        debug::print(&string::utf8(b"Pack NFT minted and transferred to user!"));
        debug::print(&string::utf8(b"User address:"));
        debug::print(&user_addr);
        
        // ================================= Open Pack ================================== //
        let pack_id = object::object_address(&pack_token_id);
        packs_manager::open_pack(
            user,
            creator,
            TEST_RANDOMNESS,
            pack_id,
        );
        
        debug::print(&string::utf8(b"Pack opened successfully!"));
        debug::print(&string::utf8(b"Randomness used:"));
        debug::print(&TEST_RANDOMNESS);
    }

    #[test(aptos_framework = @aptos_framework, creator = @ufc_strike)]
    fun test_multiple_pack_opens(
        creator: &signer,
    ) {
        // ================================= Setup ================================== //
        setup_complete_test_environment(creator);
        // ================================= Open Multiple Packs ================================== //
        let user1 = create_test_user(@0x111);
        let user2 = create_test_user(@0x222);
        let user3 = create_test_user(@0x333);
        // Open packs with different randomness
        packs_manager::open_pack(&user1, creator, 10, @0x001);
        packs_manager::open_pack(&user2, creator, 25, @0x002);
        packs_manager::open_pack(&user3, creator, 75, @0x003);
        debug::print(&string::utf8(b"Multiple packs opened successfully!"));
        debug::print(&string::utf8(b"Pack 1 opened with randomness: 10"));
        debug::print(&string::utf8(b"Pack 2 opened with randomness: 25"));
        debug::print(&string::utf8(b"Pack 3 opened with randomness: 75"));
    }

    #[test(aptos_framework = @aptos_framework, creator = @ufc_strike)]
    #[expected_failure(abort_code = 2, location = ufc_strike::packs_manager)] // ENO_DROP_ENTRY_FOUND
    fun test_open_pack_no_supply(
        creator: &signer,
    ) {
        // ================================= Setup ================================== //
        setup_creator_and_registry(creator);
        // Register only one moment
        moments_registry::register_moment(
            creator,
            TEST_COLLECTION_ID_1,
            string::utf8(b"Conor McGregor vs Khabib"),
            string::utf8(b"Epic lightweight championship fight"),
            string::utf8(b"https://ufc.com/moments/conor-khabib"),
        );
        // Initialize drop pool with 0 supply
        let listing_ids = vector::empty<u64>();
        let weights = vector::empty<u64>();
        let supplies = vector::empty<u64>();
        vector::push_back(&mut listing_ids, TEST_COLLECTION_ID_1);
        vector::push_back(&mut weights, TEST_WEIGHT_1);
        vector::push_back(&mut supplies, 0); // 0 supply
        create_drop_pool(creator, listing_ids, weights, supplies);
        // ================================= Open Pack (Should Fail) ================================== //
        let user = create_test_user(@0x123);
        // This should fail because there's no supply
        packs_manager::open_pack(
            &user,
            creator,
            TEST_RANDOMNESS,
            @0x456,
        );
    }
} 