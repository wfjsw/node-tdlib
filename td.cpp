// This file has been modified towards a simplifier and more modern design provided by https://github.com/Bannerets/tdl/blob/develop/tdl-tdlib-addon/td.cpp

#include <iostream>
#include <string>
#include <vector>
#include <napi.h>
#include "td/td/telegram/td_json_client.h"
#include "td/td/telegram/td_log.h"

Napi::Number td_client_create(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    void* client = td_json_client_create();
    return Napi::Number::New(env, (uintptr_t)client);
}

// param 1: int client_id
void td_client_destroy(const Napi::CallbackInfo& info) {
    auto client = (void*) info[0].As<Napi::Number>().Int64Value();
    td_json_client_destroy(client);
}

// param 1: int client_id
// param 2: string request
void td_client_send(const Napi::CallbackInfo& info) {
    auto client = (void *)info[0].As<Napi::Number>().Int64Value();
    std::string request_str = info[1].As<Napi::String>().Utf8Value();
    const char* request = request_str.c_str();
    td_json_client_send(client, request);
}

class ReceiverAsyncWorker : public Napi::AsyncWorker {
    public:
        ReceiverAsyncWorker(
            const Napi::Function& callback,
            void* client,
            double timeout
        ) : Napi::AsyncWorker(callback), client(client), timeout(timeout) 
        {}
    
    protected: 
        void Execute() override {
            const char* result = td_json_client_receive(client, timeout);
            res = std::string(result == NULL ? "" : result);
        }

        void OnOK() override {
            Napi::Env env = Env();
            auto str = Napi::String::New(env, res);
            Callback().MakeCallback(Receiver().Value(), {env.Null(), str});
        }

        void OnError(const Napi::Error &e) override {
            Napi::Env env = Env();
            Callback().MakeCallback(Receiver().Value(), {e.Value(), env.Undefined()});
        }

    private:
        void *client;
        double timeout;
        std::string res;
};

void td_client_receive_async(const Napi::CallbackInfo& info) {
    auto client = (void*) info[0].As<Napi::Number>().Int64Value();
    double timeout = info[1].As<Napi::Number>().DoubleValue();
    Napi::Function cb = info[2].As<Napi::Function>();
    (new ReceiverAsyncWorker(cb, client, timeout))->Queue();
}

// param 1: int client_id
// param 2: double timeout
Napi::Array td_client_receive(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    auto client = (void *)info[0].As<Napi::Number>().Int64Value();
    double timeout = (double) info[1].As<Napi::Number>().DoubleValue();
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

Napi::Boolean set_log_file_path(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    std::string file_path = info[0].As<Napi::String>().Utf8Value();
    bool result = td_set_log_file_path(file_path.c_str());
    return Napi::Boolean::New(env, result);
}

void set_log_max_file_size(const Napi::CallbackInfo& info) {
    std::int64_t max_file_size = info[0].As<Napi::Number>().Int64Value();
    td_set_log_max_file_size(max_file_size);
}

Napi::String td_client_execute(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    auto client = (void*) info[0].As<Napi::Number>().Int64Value();
    std::string request_str = info[1].As<Napi::String>().Utf8Value();
    const char* request = request_str.c_str();
    const char* response = td_json_client_execute(client, request);
    if (response == NULL) return Napi::String::New(env, "");
    return Napi::String::New(env, response);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "td_client_create"),
              Napi::Function::New(env, td_client_create));
    exports.Set(Napi::String::New(env, "td_client_send"),
              Napi::Function::New(env, td_client_send));
    exports.Set(Napi::String::New(env, "td_client_receive"),
              Napi::Function::New(env, td_client_receive));
    exports.Set(Napi::String::New(env, "td_client_receive_async"),
                Napi::Function::New(env, td_client_receive_async));
    exports.Set(Napi::String::New(env, "td_client_destroy"),
              Napi::Function::New(env, td_client_destroy));
    exports.Set(Napi::String::New(env, "td_client_execute"),
              Napi::Function::New(env, td_client_execute));
    exports.Set(Napi::String::New(env, "td_set_log_file_path"),
              Napi::Function::New(env, set_log_file_path));
    exports.Set(Napi::String::New(env, "td_set_log_max_file_size"),
              Napi::Function::New(env, set_log_max_file_size));
    exports.Set(Napi::String::New(env, "td_set_log_verbosity_level"),
              Napi::Function::New(env, set_log_verbosity_level));
    return exports;
}

NODE_API_MODULE(addon, Init)
