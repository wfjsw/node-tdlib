cmake_minimum_required(VERSION 3.3 FATAL_ERROR)

INCLUDE(CheckIncludeFileCXX)

#G++ use too much memory so we will just use clang
#set(CMAKE_C_COMPILER clang)
#set(CMAKE_CXX_COMPILER clang++)

if(APPLE)
    set(OPENSSL_ROOT_DIR /usr/local/opt/openssl)
endif(APPLE)

project(NodeTdlib VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")

check_include_file_cxx("unistd.h" HAVE_UNISTD_H)

add_subdirectory(td EXCLUDE_FROM_ALL)
include_directories(${CMAKE_JS_INC})
add_library(tdlib SHARED td.cpp ${CMAKE_JS_SRC})
target_compile_definitions(tdlib PRIVATE BUILDING_NODE_EXTENSION USING_V8_SHARED USING_UV_SHARED V8_DEPRECATION_WARNINGS)
if (HAVE_UNISTD_H)
    target_compile_definitions(tdlib PRIVATE HAVE_UNISTD_H)
endif (HAVE_UNISTD_H)

# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(tdlib PRIVATE ${NODE_ADDON_API_DIR})

set_property(TARGET tdlib PROPERTY CXX_STANDARD 11)
target_link_libraries(tdlib ${CMAKE_JS_LIB})
target_link_libraries(tdlib Td::TdJsonStatic)

set_target_properties(tdlib PROPERTIES PREFIX "" SUFFIX ".node")
