cmake_minimum_required(VERSION 3.1 FATAL_ERROR)

#G++ use too much memory so we will just use clang
set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

project(NodeTdlib VERSION 1.0 LANGUAGES CXX)

option(IS_PREBUILD "Determine whether we are prebuild binarys for other folks" OFF)

add_definitions(-DBUILDING_NODE_EXTENSION)    
add_definitions(-DUSING_V8_SHARED)
add_definitions(-DUSING_UV_SHARED)     
add_definitions(-DV8_DEPRECATION_WARNINGS) 

include_directories(${CMAKE_JS_INC})   
include_directories(node_modules/nbind/include)

if(IS_PREBUILD)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")
else()
    # Use native optimizations
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native -O3")
endif()

file(GLOB NBIND_SOURCE_FILES node_modules/nbind/src/*.cc node_modules/nbind/src/v8/*.cc)

#add_library(nbind SHARED ${SOURCE} ${NBIND_SOURCE_FILES})
add_library(nbind SHARED ${NBIND_SOURCE_FILES} td.cpp)
set_property(TARGET nbind PROPERTY CXX_STANDARD 11)
set_target_properties(nbind PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(nbind ${CMAKE_JS_LIB})
target_link_libraries(nbind Td::TdJsonStatic)
add_subdirectory(td EXCLUDE_FROM_ALL)

