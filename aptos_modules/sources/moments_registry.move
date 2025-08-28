module ufc_strike::moments_registry {
    use std::table;
    use std::string::String;
    use aptos_framework::signer;

    /// Error: signer no es el creador
    const ENOT_CREATOR: u64 = 1;

    /// Metadata para un tipo de momento
    struct MomentMetadata has copy, drop, store {
        name: String,
        description: String,
        uri: String,
    }

    /// Tabla de metadata con clave u64 (collectionId)
    struct MetadataRegistry has key {
        table: table::Table<u64, MomentMetadata>,
    }

    /// Inicializa la tabla (solo admin)
    public entry fun init_registry(admin: &signer) {
        assert_admin(admin);
        let data = table::new<u64, MomentMetadata>();
        move_to(admin, MetadataRegistry { table: data });
    }

    /// Registra metadata para un collection_id (solo admin)
    public entry fun register_moment(
        admin: &signer,
        collection_id: u64,
        name: String,
        description: String,
        uri: String,
    ) acquires MetadataRegistry {
        assert_admin(admin);
        let registry = borrow_global_mut<MetadataRegistry>(@ufc_strike);
        let meta = MomentMetadata { name, description, uri };
        table::add(&mut registry.table, collection_id, meta);
    }

    /// Actualiza metadata para un collection_id (solo admin)
    public entry fun update_moment_metadata(
        admin: &signer,
        collection_id: u64,
        new_name: String,
        new_description: String,
        new_uri: String,
    ) acquires MetadataRegistry {
        assert_admin(admin);
        let registry = borrow_global_mut<MetadataRegistry>(@ufc_strike);
        let metadata_ref = table::borrow_mut(&mut registry.table, collection_id);
        metadata_ref.name = new_name;
        metadata_ref.description = new_description;
        metadata_ref.uri = new_uri;
    }

    /// Obtiene metadata para un collection_id
    public fun get_moment_metadata(
        collection_id: u64
    ): MomentMetadata acquires MetadataRegistry {
        let registry = borrow_global<MetadataRegistry>(@ufc_strike);
        *table::borrow(&registry.table, collection_id)
    }

    /// Verifies that signer is admin (address that published the module)
    fun assert_admin(admin: &signer) {
        assert!(signer::address_of(admin) == @ufc_strike, ENOT_CREATOR);
    }

    /// Gets the name of a moment
    public fun get_moment_name(metadata: MomentMetadata): String {
        metadata.name
    }

    /// Gets the description of a moment
    public fun get_moment_description(metadata: MomentMetadata): String {
        metadata.description
    }

    /// Gets the URI of a moment
    public fun get_moment_uri(metadata: MomentMetadata): String {
        metadata.uri
    }
}
