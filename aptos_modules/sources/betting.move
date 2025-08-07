module ufc_strike::betting {

    use aptos_framework::fungible_asset::{Self, balance, Metadata, FungibleAsset, FungibleStore};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::signer;
    use aptos_framework::primary_fungible_store;

    /// Secondary store por usuario (una sola por usuario)
    struct SecondaryStore has key {
        store: Object<FungibleStore>,
        extend_ref: ExtendRef,
    }

    /// Crear un secondary store para el usuario
    public entry fun new_store(
        creator: &signer,
        metadata: Object<Metadata>
    ) {
        // Crear objeto directamente desde la cuenta
        let creator_ref = object::create_object_from_account(creator);
        // Obtener extend_ref del store
        let extend_ref = object::generate_extend_ref(&creator_ref);
        // Crear store secundario
        let store = fungible_asset::create_store(&creator_ref, metadata);

        // Guardar
        move_to(creator, SecondaryStore {
            store,
            extend_ref,
        });
    }

    /// Depositar tokens en el store del módulo
    public entry fun deposit(
        sender: &signer,
        metadata: Object<Metadata>,
        amount: u64 
    ) acquires SecondaryStore {
        let fa = primary_fungible_store::withdraw(sender, metadata, amount);
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        fungible_asset::deposit(store_data.store, fa);
    }

    /// Depositar tokens desde un store personalizado al store del módulo
    public entry fun deposit_from_store(
        sender: &signer,
        sender_store: Object<FungibleStore>,
        amount: u64 
    ) acquires SecondaryStore {
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        let fa = fungible_asset::withdraw(sender, sender_store, amount);
        fungible_asset::deposit(store_data.store, fa);
    }

    /// Retirar tokens del store del módulo
    public entry fun withdraw(
        admin: &signer,
        recipient: address,
        metadata: Object<Metadata>,
        amount: u64
    ) acquires SecondaryStore {
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        let signer_ref = object::generate_signer_for_extending(&store_data.extend_ref);
        let fa = fungible_asset::withdraw(&signer_ref, store_data.store, amount);
        primary_fungible_store::deposit(recipient, fa);
    }

    /// Obtener balance del store del módulo
    public fun get_balance(): u64 acquires SecondaryStore {
        let store_data = borrow_global<SecondaryStore>(@ufc_strike);
        balance(store_data.store)
    }
}
