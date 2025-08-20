#[test_only]
module ufc_strike::betting_test {
    use std::signer;
    use std::string;
    use std::option;
    use aptos_framework::account;
    use aptos_framework::fungible_asset::{Self, FungibleStore, Metadata, MintRef, TransferRef, BurnRef, MutateMetadataRef, supply};
    use aptos_framework::object::{Self, Object, ConstructorRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use ufc_strike::betting;

    #[test_only]
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct TestToken has key {}

    // Helper function to create test token
    #[test_only]
    public fun create_test_token(creator: &signer): (ConstructorRef, Object<TestToken>) {
        account::create_account_for_test(signer::address_of(creator));
        let creator_ref = object::create_named_object(creator, b"TEST");
        let object_signer = object::generate_signer(&creator_ref);
        move_to(&object_signer, TestToken {});

        let token = object::object_from_constructor_ref<TestToken>(&creator_ref);
        (creator_ref, token)
    }

    // Helper function to initialize metadata
    #[test_only]
    public fun init_test_metadata(constructor_ref: &ConstructorRef): (MintRef, TransferRef, BurnRef, MutateMetadataRef) {
        // Create fungible asset with primary store enabled and unlimited supply (None)
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            string::utf8(b"Test Token"),
            string::utf8(b"TST"),
            8,
            string::utf8(b"http://example.com/icon.png"),
            string::utf8(b"http://example.com")
        );

        // Generate refs
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let mutate_metadata_ref = fungible_asset::generate_mutate_metadata_ref(constructor_ref);
        (mint_ref, transfer_ref, burn_ref, mutate_metadata_ref)
    }

    // Helper function to create fungible asset
    #[test_only]
    public fun create_fungible_asset(
        creator: &signer
    ): (MintRef, TransferRef, BurnRef, MutateMetadataRef, Object<Metadata>) {
        let (creator_ref, token_object) = create_test_token(creator);
        let (mint, transfer, burn, mutate_metadata) = init_test_metadata(&creator_ref);
        (mint, transfer, burn, mutate_metadata, object::convert(token_object))
    }

    // Helper function to create test store
    #[test_only]
    public fun create_test_store<T: key>(owner: &signer, metadata: Object<T>): Object<FungibleStore> {
        let owner_addr = signer::address_of(owner);
        if (!account::exists_at(owner_addr)) {
            account::create_account_for_test(owner_addr);
        };
        fungible_asset::create_store(&object::create_object_from_account(owner), metadata)
    }

    #[test(creator = @ufc_strike)]
    fun test_store_creation(creator: &signer) {
        let (_, _, _, _, metadata) = create_fungible_asset(creator);
        
        betting::new_store(creator, metadata);
        
        let balance = betting::get_balance();
        assert!(balance == 0, 1);
    }

    #[test(creator = @ufc_strike)]
    fun test_basic_functionality(creator: &signer) {
        let (_, _, _, _, metadata) = create_fungible_asset(creator);
        
        // Create store
        betting::new_store(creator, metadata);
        
        // Verify initial balance
        let balance = betting::get_balance();
        assert!(balance == 0, 2);
    }
    #[test(creator = @ufc_strike, user = @0x123)]
    fun test_deposit_from_store_functionality(creator: &signer, user: &signer) {

        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
    

        let (mint_ref, _, _, _, metadata) = create_fungible_asset(creator);
        betting::new_store(creator, metadata);
        let balance = betting::get_balance();
        assert!(balance == 0, 3);
        
        // Create custom store for the user
        let user_store = create_test_store(user, metadata);
        
        // Verify initial supply
        assert!(supply(metadata) == option::some(0), 1);
 
        // Mint tokens to user's custom store - 1 million tokens
        let fa = fungible_asset::mint(&mint_ref, 1000000);
        assert!(supply(metadata) == option::some(1000000), 2);
        fungible_asset::deposit(user_store, fa);
        
        // Verify that the user has tokens in their custom store
        let user_balance = fungible_asset::balance(user_store);
        assert!(user_balance == 1000000, 5);
        
        // Make deposit from custom store to betting module - 500k tokens
        betting::deposit_from_store(user, user_store, 500000);
        
        // Verify balance after deposit
        let balance_after = betting::get_balance();
        assert!(balance_after == 500000, 6);
        
        // Verify that the user has fewer tokens
        let user_balance_after = fungible_asset::balance(user_store);
        assert!(user_balance_after == 500000, 7);
        
    }

    #[test(creator = @ufc_strike, user = @0x123)]
    fun test_deposit_functionality(creator: &signer, user: &signer) {

        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
    

        let (mint_ref, _, _, _, metadata) = create_fungible_asset(creator);
        betting::new_store(creator, metadata);
        let balance = betting::get_balance();
        assert!(balance == 0, 3);
        
        
        // Verify initial supply
        assert!(supply(metadata) == option::some(0), 1);
 
        // Mint tokens to user's custom store - 1 million tokens
        let fa = fungible_asset::mint(&mint_ref, 1000000);
        assert!(supply(metadata) == option::some(1000000), 2);

        let user_address = signer::address_of(user);
        primary_fungible_store::deposit(user_address, fa);
        
        // Verify that the user has tokens in their custom store
        assert!(primary_fungible_store::balance(user_address, metadata) == 1000000, 3);
        // Make deposit from custom store to betting module - 400k tokens
        betting::deposit(user, metadata, 400000);
        
        // Verify balance after deposit
        let balance_after = betting::get_balance();
        assert!(balance_after == 400000, 6);
        
        // Verify that the user has fewer tokens
        assert!(primary_fungible_store::balance(user_address, metadata) == 600000, 7);
        
    }
} 