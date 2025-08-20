#[test_only]
module ufc_strike::token_helper {
    use std::signer;
    use std::option;
    use std::string;
    use aptos_framework::account;

    use aptos_framework::fungible_asset::{Self, FungibleStore, Metadata, MintRef, TransferRef, BurnRef, MutateMetadataRef, supply};
    use aptos_framework::object::{Self, Object, ConstructorRef};
    use aptos_framework::primary_fungible_store;

    #[test_only]
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct TestToken has key {}

    #[test_only]
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
    }

    #[test_only]
    public fun create_test_account(account: &signer) {
        let account_addr = signer::address_of(account);
        if (!account::exists_at(account_addr)) {
            account::create_account_for_test(account_addr);
        };
    }

    #[test_only]
    public fun create_test_token(creator: &signer): (ConstructorRef, Object<TestToken>) {
        create_test_account(creator);
        let creator_ref = object::create_named_object(creator, b"TEST");
        let object_signer = object::generate_signer(&creator_ref);
        move_to(&object_signer, TestToken {});

        let token = object::object_from_constructor_ref<TestToken>(&creator_ref);
        (creator_ref, token)
    }

    #[test_only]
    public fun create_test_store<T: key>(owner: &signer, metadata: Object<T>): Object<FungibleStore> {
        create_test_account(owner);
        fungible_asset::create_store(&object::create_object_from_account(owner), metadata)
    }

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

        // Generate refs to be able to mint/transfer/burn and mutate metadata
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let mutate_metadata_ref = fungible_asset::generate_mutate_metadata_ref(constructor_ref);

        // Store the refs under the Metadata object
        let metadata_object_signer = object::generate_signer(constructor_ref);
        move_to(&metadata_object_signer, ManagedFungibleAsset { mint_ref, transfer_ref, burn_ref });

        // Return new refs for immediate use
        let mint_ref_ret = fungible_asset::generate_mint_ref(constructor_ref);
        let transfer_ref_ret = fungible_asset::generate_transfer_ref(constructor_ref);
        let burn_ref_ret = fungible_asset::generate_burn_ref(constructor_ref);
        (mint_ref_ret, transfer_ref_ret, burn_ref_ret, mutate_metadata_ref)
    }

    #[test_only]
    public fun create_fungible_asset(
        creator: &signer
    ): (MintRef, TransferRef, BurnRef, MutateMetadataRef, Object<Metadata>) {
        let (creator_ref, token_object) = create_test_token(creator);
        let (mint, transfer, burn, mutate_metadata) = init_test_metadata(&creator_ref);
        (mint, transfer, burn, mutate_metadata, object::convert(token_object))
    }

    #[test_only]
    public fun get_metadata(creator: &signer): Object<Metadata> {
        let creator_addr = signer::address_of(creator);
        let metadata_addr = object::create_object_address(&creator_addr, b"TEST");
        object::address_to_object<Metadata>(metadata_addr)
    }

    fun mint_internal(admin: &signer, to: address, amount: u64) acquires ManagedFungibleAsset {
        let metadata = get_metadata(admin);
        let refs = borrow_global<ManagedFungibleAsset>(object::object_address(&metadata));
        let to_store = primary_fungible_store::ensure_primary_store_exists(to, metadata);
        let fa = fungible_asset::mint(&refs.mint_ref, amount);
        fungible_asset::deposit_with_ref(&refs.transfer_ref, to_store, fa);
    }

    #[test_only]
    public entry fun mint(admin: &signer, to: address, amount: u64) acquires ManagedFungibleAsset {
        mint_internal(admin, to, amount)
    }

    #[test_only]
    public fun create_fungible_asset_with_initial_mint(
        creator: &signer,
        initial_amount: u64
    ): (MintRef, TransferRef, BurnRef, MutateMetadataRef, Object<Metadata>) acquires ManagedFungibleAsset {
        let (mint, transfer, burn, mutate_metadata, metadata) = create_fungible_asset(creator);
        let creator_addr = signer::address_of(creator);
        mint_internal(creator, creator_addr, initial_amount);
        (mint, transfer, burn, mutate_metadata, metadata)
    }

    #[test_only]
    public fun mint_tokens_to_account(
        mint_ref: &MintRef,
        account: &signer,
        amount: u64
    ) {
        let account_addr = signer::address_of(account);
        let fa = fungible_asset::mint(mint_ref, amount);
        primary_fungible_store::deposit(account_addr, fa);
    }

    #[test_only]
    public fun get_account_balance(account: &signer, metadata: Object<Metadata>): u64 {
        let account_addr = signer::address_of(account);
        primary_fungible_store::balance(account_addr, metadata)
    }

    #[test_only]
    public fun assert_account_balance(account: &signer, metadata: Object<Metadata>, expected_balance: u64) {
        let actual_balance = get_account_balance(account, metadata);
        assert!(actual_balance == expected_balance, 1);
    }

    #[test_only]
    public fun assert_token_supply(metadata: Object<Metadata>, expected_supply: u64) {
        assert!(supply(metadata) == option::some((expected_supply as u128)), 1);
    }
}
