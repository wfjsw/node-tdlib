cmake_minimum_required(VERSION 3.1 FATAL_ERROR)

#G++ use too much memory so we will just use clang
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

project(NodeTdlib VERSION 1.0 LANGUAGES CXX)

option(IS_PREBUILD "Determine whether we are prebuild binarys for other folks" OFF)
option(USE_NAPI "Use N-API" OFF)

if(IS_PREBUILD)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
else()
    # Use native optimizations
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native -O3")
endif()

#add_definitions(-DBUILDING_NODE_EXTENSION)
#add_definitions(-DUSING_V8_SHARED)
#add_definitions(-DUSING_UV_SHARED)
#add_definitions(-DV8_DEPRECATION_WARNINGS)

add_subdirectory(td EXCLUDE_FROM_ALL)

#include_directories(${CMAKE_JS_INC})

if(USE_NAPI)
    #include_directories(node_modules/node-addon-api)
    file(GLOB NAPI_SOURCE_FILES node_modules/node-addon-api/src/*.cc)
    #add_library(node-api STATIC ${NAPI_SOURCE_FILES})
    #target_compile_definitions(node-api PRIVATE EXTERNAL_NAPI)

    add_library(tdlib SHARED td_napi.cpp)
    target_compile_definitions(tdlib PRIVATE BUILDING_NODE_EXTENSION USING_V8_SHARED USING_UV_SHARED V8_DEPRECATION_WARNINGS)
    target_include_directories(tdlib PRIVATE ${CMAKE_JS_INC} node_modules/node-addon-api)
    #target_link_libraries(tdlib node-api)
    target_link_libraries(tdlib ${CMAKE_JS_LIB})
    target_link_libraries(tdlib Td::TdJsonStatic)

    set_target_properties(tdlib PROPERTIES PREFIX "" SUFFIX ".node")
else()
    include_directories(node_modules/nbind/include)

    file(GLOB NBIND_SOURCE_FILES node_modules/nbind/src/*.cc node_modules/nbind/src/v8/*.cc)

    #add_library(nbind SHARED ${SOURCE} ${NBIND_SOURCE_FILES})
    add_library(nbind SHARED ${NBIND_SOURCE_FILES} td.cpp)
    set_property(TARGET nbind PROPERTY CXX_STANDARD 11)
    target_compile_definitions(nbind PRIVATE BUILDING_NODE_EXTENSION USING_V8_SHARED USING_UV_SHARED V8_DEPRECATION_WARNINGS)
    target_include_directories(nbind PRIVATE ${CMAKE_JS_INC} node_modules/nbind/include)
    set_target_properties(nbind PROPERTIES PREFIX "" SUFFIX ".node")
    target_link_libraries(nbind ${CMAKE_JS_LIB})
    target_link_libraries(nbind Td::TdJsonStatic)
endif()



