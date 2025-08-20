module ufc_strike::betting {

    use aptos_framework::fungible_asset::{Self, balance, Metadata, FungibleStore};
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::primary_fungible_store;
 
    struct SecondaryStore has key {
        store: Object<FungibleStore>,
        extend_ref: ExtendRef,
    }

    /// Create a secondary store for the user
    public entry fun new_store(
        creator: &signer,
        metadata: Object<Metadata>
    ) {
        // Create object directly from account
        let creator_ref = object::create_object_from_account(creator);
        // Get extend_ref from store
        let extend_ref = object::generate_extend_ref(&creator_ref);
        // Create secondary store
        let store = fungible_asset::create_store(&creator_ref, metadata);

        // Save
        move_to(creator, SecondaryStore {
            store,
            extend_ref,
        });
    }

    /// Deposit tokens to the module's store
    public entry fun deposit(
        sender: &signer,
        metadata: Object<Metadata>,
        amount: u64 
    ) acquires SecondaryStore {
        let fa = primary_fungible_store::withdraw(sender, metadata, amount);
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        fungible_asset::deposit(store_data.store, fa);
    }

    /// Deposit tokens from a custom store to the module's store
    public entry fun deposit_from_store(
        sender: &signer,
        sender_store: Object<FungibleStore>,
        amount: u64 
    ) acquires SecondaryStore {
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        let fa = fungible_asset::withdraw(sender, sender_store, amount);
        fungible_asset::deposit(store_data.store, fa);
    }

    /// Withdraw tokens from the module's store
    public entry fun withdraw(
        _admin: &signer,
        recipient: address,
        _metadata: Object<Metadata>,
        amount: u64
    ) acquires SecondaryStore {
        let store_data = borrow_global_mut<SecondaryStore>(@ufc_strike);
        let signer_ref = object::generate_signer_for_extending(&store_data.extend_ref);
        let fa = fungible_asset::withdraw(&signer_ref, store_data.store, amount);
        primary_fungible_store::deposit(recipient, fa);
    }

    /// Get balance of the module's store
    public fun get_balance(): u64 acquires SecondaryStore {
        let store_data = borrow_global<SecondaryStore>(@ufc_strike);
        balance(store_data.store)
    }
}
