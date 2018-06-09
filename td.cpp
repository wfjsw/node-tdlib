#include <iostream>
#include <string>
#include <vector>
#include <napi.h>
#include "td/td/telegram/td_json_client.h"
#include "td/td/telegram/td_log.h"

std::vector <void *> clients;

Napi::Number td_client_create(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    void* client = td_json_client_create();
    clients.push_back(client);
    return Napi::Number::New(env, (int)clients.size() - 1);
}

// param 1: int client_id
void td_client_destroy(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    int client_id = (int) info[0].As<Napi::Number>().Int32Value();
    void* client = clients.at(client_id);
    td_json_client_destroy(client);
}

// param 1: int client_id
// param 2: string request
void td_client_send(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    int client_id = (int) info[0].As<Napi::Number>().Int32Value();
    std::string request_str = (std::string) info[1].As<Napi::String>().Utf8Value();
    const char* request = request_str.c_str();
    std::cout << request << std::endl;
    void* client = clients.at(client_id);
    td_json_client_send(client, request);
}

// param 1: int client_id
// param 2: double timeout
Napi::Array td_client_receive(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    int client_id = (int) info[0].As<Napi::Number>().Int32Value();
    double timeout = (double) info[1].As<Napi::Number>().DoubleValue();
    void* client = clients.at(client_id);
    Napi::Array datas = Napi::Array::New(env); 
    const char* data = td_json_client_receive(client, timeout);
    int length = 0;
    while (data) {
        datas.Set(length, Napi::String::New(env, data));
        length++;
        data = td_json_client_receive(client, 0);
    }
    return datas;
}

void set_log_verbosity_level(const Napi::CallbackInfo& info) {
    int level = (int) info[0].As<Napi::Number>().Int32Value();
    td_set_log_verbosity_level(level);
}

void set_log_file_path(const Napi::CallbackInfo& info) {
    std::string file_path = info[0].As<Napi::String>().Utf8Value();
    td_set_log_file_path(file_path.c_str());
}

void set_log_max_file_size(const Napi::CallbackInfo& info) {
    std::int64_t max_file_size = info[0].As<Napi::Number>().Int64Value();
    td_set_log_max_file_size(max_file_size);
}
/*
const char *td_client_execute(int client_id, const char *request) {
    void* client = clients.at(client_id);
    return td_json_client_execute(client, request);
}
*/

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "td_client_create"),
              Napi::Function::New(env, td_client_create));
    exports.Set(Napi::String::New(env, "td_client_send"),
              Napi::Function::New(env, td_client_send));
    exports.Set(Napi::String::New(env, "td_client_receive"),
              Napi::Function::New(env, td_client_receive));
    exports.Set(Napi::String::New(env, "td_client_destroy"),
              Napi::Function::New(env, td_client_destroy));
    //exports.Set(Napi::String::New(env, "td_client_execute"),
    //          Napi::Function::New(env, td_client_execute));
    exports.Set(Napi::String::New(env, "td_set_log_file_path"),
              Napi::Function::New(env, set_log_file_path));
    exports.Set(Napi::String::New(env, "td_set_log_max_file_size"),
              Napi::Function::New(env, set_log_max_file_size));
    exports.Set(Napi::String::New(env, "td_set_log_verbosity_level"),
              Napi::Function::New(env, set_log_verbosity_level));
    return exports;
}

NODE_API_MODULE(addon, Init)
