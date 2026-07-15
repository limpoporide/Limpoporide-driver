if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/home/maxsys/.gradle/caches/9.3.1/transforms/d4d3510eec4a086dc7bfd745f62ae404/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/maxsys/.gradle/caches/9.3.1/transforms/d4d3510eec4a086dc7bfd745f62ae404/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

