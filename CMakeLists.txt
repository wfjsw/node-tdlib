cmake_minimum_required(VERSION 3.3 FATAL_ERROR)

INCLUDE(CheckIncludeFileCXX)

#G++ use too much memory so we will just use clang
#set(CMAKE_C_COMPILER clang)
#set(CMAKE_CXX_COMPILER clang++)

project(NodeTdlib VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3")

check_include_file_cxx("unistd.h" HAVE_UNISTD_H)

add_subdirectory(td EXCLUDE_FROM_ALL)
add_library(tdlib SHARED td.cpp)
target_compile_definitions(tdlib PRIVATE BUILDING_NODE_EXTENSION USING_V8_SHARED USING_UV_SHARED V8_DEPRECATION_WARNINGS)
if (HAVE_UNISTD_H)
    target_compile_definitions(tdlib PRIVATE HAVE_UNISTD_H)
endif (HAVE_UNISTD_H)
target_include_directories(tdlib PRIVATE ${CMAKE_JS_INC} node_modules/node-addon-api)
set_property(TARGET tdlib PROPERTY CXX_STANDARD 11)
target_link_libraries(tdlib ${CMAKE_JS_LIB})
target_link_libraries(tdlib Td::TdJsonStatic)

set_target_properties(tdlib PROPERTIES PREFIX "" SUFFIX ".node")

