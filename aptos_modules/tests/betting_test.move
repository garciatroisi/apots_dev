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

    /// Test token para pruebas
    #[test_only]
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct TestToken has key {}

    /// Función helper para crear test token
    #[test_only]
    public fun create_test_token(creator: &signer): (ConstructorRef, Object<TestToken>) {
        account::create_account_for_test(signer::address_of(creator));
        let creator_ref = object::create_named_object(creator, b"TEST");
        let object_signer = object::generate_signer(&creator_ref);
        move_to(&object_signer, TestToken {});

        let token = object::object_from_constructor_ref<TestToken>(&creator_ref);
        (creator_ref, token)
    }

    /// Función helper para inicializar metadata
    #[test_only]
    public fun init_test_metadata(constructor_ref: &ConstructorRef): (MintRef, TransferRef, BurnRef, MutateMetadataRef) {
        let (mint_ref, transfer_ref, burn_ref) = primary_fungible_store::init_test_metadata_with_primary_store_enabled(constructor_ref);
        let mutate_metadata_ref = fungible_asset::generate_mutate_metadata_ref(constructor_ref);
        (mint_ref, transfer_ref, burn_ref, mutate_metadata_ref)
    }

    /// Función helper para crear fungible asset
    #[test_only]
    public fun create_fungible_asset(
        creator: &signer
    ): (MintRef, TransferRef, BurnRef, MutateMetadataRef, Object<Metadata>) {
        let (creator_ref, token_object) = create_test_token(creator);
        let (mint, transfer, burn, mutate_metadata) = init_test_metadata(&creator_ref);
        (mint, transfer, burn, mutate_metadata, object::convert(token_object))
    }

    /// Función helper para crear test store
    #[test_only]
    public fun create_test_store<T: key>(owner: &signer, metadata: Object<T>): Object<FungibleStore> {
        let owner_addr = signer::address_of(owner);
        if (!account::exists_at(owner_addr)) {
            account::create_account_for_test(owner_addr);
        };
        fungible_asset::create_store(&object::create_object_from_account(owner), metadata)
    }

    /// Test básico para crear store
    #[test(creator = @ufc_strike)]
    fun test_store_creation(creator: &signer) {
        let (_, _, _, _, metadata) = create_fungible_asset(creator);
        
        betting::new_store(creator, metadata);
        
        let balance = betting::get_balance();
        assert!(balance == 0, 1);
    }

    /// Test simple para verificar que el módulo funciona
    #[test(creator = @ufc_strike)]
    fun test_basic_functionality(creator: &signer) {
        let (_, _, _, _, metadata) = create_fungible_asset(creator);
        
        // Crear store
        betting::new_store(creator, metadata);
        
        // Verificar balance inicial
        let balance = betting::get_balance();
        assert!(balance == 0, 2);
    }

    /// Test para verificar funcionalidad de deposit
    #[test(creator = @ufc_strike, user = @0x123)]
    fun test_deposit_from_store_functionality(creator: &signer, user: &signer) {

        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
    

        let (mint_ref, _, _, _, metadata) = create_fungible_asset(creator);
        betting::new_store(creator, metadata);
        let balance = betting::get_balance();
        assert!(balance == 0, 3);
        
        // Crear store personalizado para el usuario
        let user_store = create_test_store(user, metadata);
        
        // Verificar supply inicial
        assert!(supply(metadata) == option::some(0), 1);
 
        // Mint tokens al store personalizado del usuario
        let fa = fungible_asset::mint(&mint_ref, 100);
        assert!(supply(metadata) == option::some(100), 2);
        fungible_asset::deposit(user_store, fa);
        
        // Verificar que el usuario tiene tokens en su store personalizado
        let user_balance = fungible_asset::balance(user_store);
        assert!(user_balance == 100, 5);
        
        // Hacer deposit desde el store personalizado al módulo betting
        betting::deposit_from_store(user, user_store, 50);
        
        // Verificar balance después del deposit
        let balance_after = betting::get_balance();
        assert!(balance_after == 50, 6);
        
        // Verificar que el usuario tiene menos tokens
        let user_balance_after = fungible_asset::balance(user_store);
        assert!(user_balance_after == 50, 7);
        
    }

    #[test(creator = @ufc_strike, user = @0x123)]
    fun test_deposit_functionality(creator: &signer, user: &signer) {

        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
    

        let (mint_ref, _, _, _, metadata) = create_fungible_asset(creator);
        betting::new_store(creator, metadata);
        let balance = betting::get_balance();
        assert!(balance == 0, 3);
        
        
        // Verificar supply inicial
        assert!(supply(metadata) == option::some(0), 1);
 
        // Mint tokens al store personalizado del usuario
        let fa = fungible_asset::mint(&mint_ref, 100);
        assert!(supply(metadata) == option::some(100), 2);

        let user_address = signer::address_of(user);
        primary_fungible_store::deposit(user_address, fa);
        
        // Verificar que el usuario tiene tokens en su store personalizado
        assert!(primary_fungible_store::balance(user_address, metadata) == 100, 3);
        // Hacer deposit desde el store personalizado al módulo betting
        betting::deposit(user, metadata, 40);
        
        // Verificar balance después del deposit
        let balance_after = betting::get_balance();
        assert!(balance_after == 40, 6);
        
        // Verificar que el usuario tiene menos tokens
        assert!(primary_fungible_store::balance(user_address, metadata) == 60, 7);
        
    }
} 