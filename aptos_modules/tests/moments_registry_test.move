#[test_only]
module ufc_strike::moments_registry_test {
    use std::string;
    use aptos_framework::account;
    use aptos_std::debug;
    use ufc_strike::moments_registry;

    // Test constants
    const TEST_COLLECTION_ID: u64 = 1;
    const TEST_NAME: vector<u8> = b"Conor McGregor vs Khabib";
    const TEST_DESCRIPTION: vector<u8> = b"Epic lightweight championship fight";
    const TEST_URI: vector<u8> = b"https://ufc.com/moments/conor-khabib";

    const UPDATED_NAME: vector<u8> = b"McGregor vs Nurmagomedov";
    const UPDATED_DESCRIPTION: vector<u8> = b"Updated description for the fight";
    const UPDATED_URI: vector<u8> = b"https://ufc.com/moments/updated-conor-khabib";

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    fun test_init_registry(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // ================================= Initialize Registry ================================== //
        moments_registry::init_registry(admin);
        debug::print(&string::utf8(b"Registry initialized successfully!"));
    }

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    fun test_register_moment(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // Initialize registry first
        moments_registry::init_registry(admin);

        // ================================= Register Moment ================================== //
        let name = string::utf8(TEST_NAME);
        let description = string::utf8(TEST_DESCRIPTION);
        let uri = string::utf8(TEST_URI);

        moments_registry::register_moment(
            admin,
            TEST_COLLECTION_ID,
            name,
            description,
            uri,
        );

        debug::print(&string::utf8(b"Moment registered successfully!"));
        debug::print(&string::utf8(b"Collection ID:"));
        debug::print(&TEST_COLLECTION_ID);
    }

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    fun test_get_moment_metadata(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // Initialize registry first
        moments_registry::init_registry(admin);

        // Register a moment
        let name = string::utf8(TEST_NAME);
        let description = string::utf8(TEST_DESCRIPTION);
        let uri = string::utf8(TEST_URI);

        moments_registry::register_moment(
            admin,
            TEST_COLLECTION_ID,
            name,
            description,
            uri,
        );

        // ================================= Get Moment Metadata ================================== //
        let metadata = moments_registry::get_moment_metadata(TEST_COLLECTION_ID);

        debug::print(&string::utf8(b"=== MOMENT METADATA ==="));
        debug::print(&string::utf8(b"Name:"));
        debug::print(&moments_registry::get_moment_name(metadata));
        debug::print(&string::utf8(b"Description:"));
        debug::print(&moments_registry::get_moment_description(metadata));
        debug::print(&string::utf8(b"URI:"));
        debug::print(&moments_registry::get_moment_uri(metadata));
        debug::print(&string::utf8(b"====================="));
    }

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    fun test_update_moment_metadata(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // Initialize registry first
        moments_registry::init_registry(admin);

        // Register initial moment
        let name = string::utf8(TEST_NAME);
        let description = string::utf8(TEST_DESCRIPTION);
        let uri = string::utf8(TEST_URI);

        moments_registry::register_moment(
            admin,
            TEST_COLLECTION_ID,
            name,
            description,
            uri,
        );

        // ================================= Update Moment Metadata ================================== //
        let updated_name = string::utf8(UPDATED_NAME);
        let updated_description = string::utf8(UPDATED_DESCRIPTION);
        let updated_uri = string::utf8(UPDATED_URI);

        moments_registry::update_moment_metadata(
            admin,
            TEST_COLLECTION_ID,
            updated_name,
            updated_description,
            updated_uri,
        );

        // Verify the update
        let metadata = moments_registry::get_moment_metadata(TEST_COLLECTION_ID);

        debug::print(&string::utf8(b"=== UPDATED MOMENT METADATA ==="));
        debug::print(&string::utf8(b"Updated Name:"));
        debug::print(&moments_registry::get_moment_name(metadata));
        debug::print(&string::utf8(b"Updated Description:"));
        debug::print(&moments_registry::get_moment_description(metadata));
        debug::print(&string::utf8(b"Updated URI:"));
        debug::print(&moments_registry::get_moment_uri(metadata));
        debug::print(&string::utf8(b"============================="));
    }

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    fun test_multiple_moments(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // Initialize registry first
        moments_registry::init_registry(admin);

        // ================================= Register Multiple Moments ================================== //
        // Moment 1
        moments_registry::register_moment(
            admin,
            1,
            string::utf8(b"Jon Jones vs Daniel Cormier"),
            string::utf8(b"Light heavyweight championship"),
            string::utf8(b"https://ufc.com/moments/jones-cormier"),
        );

        // Moment 2
        moments_registry::register_moment(
            admin,
            2,
            string::utf8(b"Anderson Silva vs Chris Weidman"),
            string::utf8(b"Middleweight championship upset"),
            string::utf8(b"https://ufc.com/moments/silva-weidman"),
        );

        // Moment 3
        moments_registry::register_moment(
            admin,
            3,
            string::utf8(b"Ronda Rousey vs Holly Holm"),
            string::utf8(b"Women's bantamweight championship"),
            string::utf8(b"https://ufc.com/moments/rousey-holm"),
        );

        // ================================= Verify All Moments ================================== //
        let metadata1 = moments_registry::get_moment_metadata(1);
        let metadata2 = moments_registry::get_moment_metadata(2);
        let metadata3 = moments_registry::get_moment_metadata(3);

        debug::print(&string::utf8(b"=== MULTIPLE MOMENTS TEST ==="));
        debug::print(&string::utf8(b"Moment 1:"));
        debug::print(&moments_registry::get_moment_name(metadata1));
        debug::print(&string::utf8(b"Moment 2:"));
        debug::print(&moments_registry::get_moment_name(metadata2));
        debug::print(&string::utf8(b"Moment 3:"));
        debug::print(&moments_registry::get_moment_name(metadata3));
        debug::print(&string::utf8(b"============================"));
    }

    #[test(aptos_framework = @aptos_framework, admin = @ufc_strike)]
    #[expected_failure(abort_code = 1, location = ufc_strike::moments_registry)] // ENOT_CREATOR
    fun test_unauthorized_access(
        admin: &signer,
    ) {
        // ================================= Setup ================================== //
        // Create a different account
        let unauthorized_addr = @0x123;
        account::create_account_for_test(unauthorized_addr);
        let unauthorized_signer = account::create_signer_with_capability(
            &account::create_test_signer_cap(unauthorized_addr)
        );

        // Initialize registry with admin
        moments_registry::init_registry(admin);

        // Try to register moment with unauthorized signer (should fail)
        moments_registry::register_moment(
            &unauthorized_signer,
            TEST_COLLECTION_ID,
            string::utf8(TEST_NAME),
            string::utf8(TEST_DESCRIPTION),
            string::utf8(TEST_URI),
        );
    }
} 