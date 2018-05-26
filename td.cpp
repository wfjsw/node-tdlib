#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include "td/td/telegram/td_json_client.h"
#include "td/td/telegram/td_log.h"

std::vector <void *> clients;

int td_client_create() {
    void* client = td_json_client_create();
    clients.push_back(client);
    return (int)clients.size() - 1;
}
void td_client_destroy(int client_id) {
    void* client = clients.at(client_id);
    td_json_client_destroy(client);
}
void td_client_send(int client_id, const char *request) {
    void* client = clients.at(client_id);
    td_json_client_send(client, request);
}
std::vector <std::string> td_client_receive(int client_id, double timeout) {
    void* client = clients.at(client_id);
    std::vector <std::string> datas; 
    const char* data = td_json_client_receive(client, timeout);
    while (data) {
        datas.push_back(std::string(data));
        data = td_json_client_receive(client, 0);
    }
    return datas;
}
const char *td_client_execute(int client_id, const char *request) {
    void* client = clients.at(client_id);
    return td_json_client_execute(client, request);
}

#include "nbind/nbind.h"
NBIND_GLOBAL() {
    function(td_client_create);
    function(td_client_send);
    function(td_client_receive);
    function(td_client_destroy);
    function(td_client_execute);
    function(td_set_log_file_path);
    function(td_set_log_max_file_size);
    function(td_set_log_verbosity_level);
}

