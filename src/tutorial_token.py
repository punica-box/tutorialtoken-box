import os

from flask import Flask, request, send_from_directory, render_template, url_for
from flask_jsglue import JSGlue
from flask import json

from ontology.wallet.wallet_manager import WalletManager
from ontology.exception.exception import SDKException
from ontology.ont_sdk import OntologySdk
from ontology.utils import util

app = Flask('DXToken', static_folder='static', template_folder='templates')
app.config.from_object('default_settings')
jsglue = JSGlue()
jsglue.init_app(app)

sdk = OntologySdk()
sdk.set_rpc(app.config['DEFAULT_REMOTE_RPC_ADDRESS'])
oep4 = sdk.neo_vm().oep4()
oep4.set_contract_address(app.config['DEFAULT_CONTRACT_ADDRESS'])
gas_price = app.config['GAS_PRICE']
gas_limit = app.config['GAS_LIMIT']
wallet_manager = WalletManager()
wallet_path = os.path.join(os.getcwd(), 'wallet', 'wallet.json')
if os.path.isfile(wallet_path):
    wallet_manager.open_wallet(wallet_path)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico',
                               mimetype='image/vnd.microsoft.icon')


@app.route('/get_accounts')
def get_accounts():
    account_list = wallet_manager.get_wallet().get_accounts()
    address_list = list()
    for acct in account_list:
        acct_item = {'b58_address': acct.address, 'label': acct.label}
        address_list.append(acct_item)
    return json.jsonify({'result': address_list}), 200


@app.route('/create_account', methods=['POST'])
def create_account():
    password = request.json.get('password')
    label = request.json.get('label')
    hex_private_key = util.get_random_bytes(32).hex()
    wallet_manager.create_account_from_private_key(label, password, hex_private_key)
    wallet_manager.save()
    return json.jsonify({'hex_private_key': hex_private_key})


@app.route('/import_account', methods=['POST'])
def import_account():
    label = request.json.get('label')
    password = request.json.get('password')
    hex_private_key = request.json.get('hex_private_key')
    print(label, password, hex_private_key)
    try:
        account = wallet_manager.create_account_from_private_key(label, password, hex_private_key)
    except ValueError as e:
        return json.jsonify({'msg': 'account exists.'}), 500
    b58_address = account.get_address()
    wallet_manager.save()
    return json.jsonify({'result': b58_address}), 200


@app.route('/account_change', methods=['POST'])
def account_change():
    b58_address_selected = request.json.get('b58_address_selected')
    try:
        wallet_manager.wallet_in_mem.set_default_account_by_address(b58_address_selected)
        return json.jsonify({'result': 'change successful'}), 200
    except SDKException:
        return json.jsonify({'result': 'Invalid address'}), 400


@app.route('/remove_account', methods=['POST'])
def remove_account():
    b58_address_remove = request.json.get('b58_address_remove')
    password = request.json.get('password')
    try:
        acct = wallet_manager.get_account(b58_address_remove, password)
        if acct is None:
            return json.jsonify({'result': ''.join(['remove ', b58_address_remove, ' failed!'])}), 500
        wallet_manager.wallet_in_mem.remove_account(b58_address_remove)
        wallet_manager.save()
        return json.jsonify({'result': ''.join(['remove ', b58_address_remove, ' successful!'])}), 200
    except SDKException or RuntimeError:
        return json.jsonify({'result': ''.join(['remove ', b58_address_remove, ' failed!'])}), 500


@app.route('/set_contract_address', methods=['POST'])
def set_contract_address():
    contract_address = request.json.get('contract_address')
    oep4.set_contract_address(contract_address)
    return json.jsonify({'result': contract_address}), 200


@app.route('/change_net', methods=['POST'])
def change_net():
    network_selected = request.json.get('network_selected')
    if network_selected == 'MainNet':
        remote_rpc_address = 'http://dappnode1.ont.io:20336'
        with app.app_context() as context:
            sdk.set_rpc(remote_rpc_address)
            sdk_rpc_address = sdk.get_rpc().addr
            if sdk_rpc_address != remote_rpc_address:
                result = ''.join(['remote rpc address set failed. the rpc address now used is ', sdk_rpc_address])
                return json.jsonify({'result': result}), 409
    elif network_selected == 'TestNet':
        remote_rpc_address = 'http://polaris3.ont.io:20336'
        with app.app_context() as context:
            sdk.set_rpc(remote_rpc_address)
            sdk_rpc_address = sdk.get_rpc().addr
            if sdk_rpc_address != remote_rpc_address:
                result = ''.join(['remote rpc address set failed. the rpc address now used is ', sdk_rpc_address])
                return json.jsonify({'result': result}), 409
    elif network_selected == 'Localhost':
        remote_rpc_address = 'http://localhost:20336'
        with app.app_context() as context:
            sdk.set_rpc(remote_rpc_address)
            old_remote_rpc_address = sdk.get_rpc()
            sdk_rpc_address = sdk.get_rpc().addr
            if sdk_rpc_address != remote_rpc_address:
                result = ''.join(['remote rpc address set failed. the rpc address now used is ', sdk_rpc_address])
                return json.jsonify({'result': result}), 409
            try:
                sdk.rpc.get_version()
            except SDKException as e:
                sdk.set_rpc(old_remote_rpc_address)
                error_msg = 'Other Error, ConnectionError'
                if error_msg in e.args[1]:
                    return json.jsonify({'result': 'Connection to localhost node failed.'}), 400
                else:
                    return json.jsonify({'result': e.args[1]}), 500
    else:
        return json.jsonify({'result': 'unsupported network.'}), 501
    global oep4
    oep4 = sdk.neo_vm().oep4()
    return json.jsonify({'result': 'succeed'}), 200


@app.route('/get_smart_contract_event', methods=['POST'])
def get_smart_contract_event():
    tx_hash = request.json.get('tx_hash')
    event_info_select = request.json.get('event_info_select')
    event = sdk.rpc.get_smart_contract_event_by_tx_hash(tx_hash)
    try:
        result = event[event_info_select]
    except KeyError:
        result = ''
    return json.jsonify({'result': result}), 200


@app.route('/get_name')
def get_name():
    name = oep4.get_name()
    return json.jsonify({'result': name}), 200


@app.route('/get_symbol')
def get_symbol():
    symbol = oep4.get_symbol()
    return json.jsonify({'result': symbol}), 200


@app.route('/get_decimal')
def get_decimal():
    decimal = oep4.get_decimal()
    return json.jsonify({'result': decimal}), 200


@app.route('/query_balance', methods=['POST'])
def query_balance():
    b58_address = request.json.get('b58_address')
    asset_select = request.json.get('asset_select')
    if asset_select == 'OEP4 Token':
        balance = oep4.balance_of(b58_address)
        return json.jsonify({'result': balance}), 200
    elif asset_select == 'ONT':
        balance = sdk.rpc.get_balance(b58_address)
        return json.jsonify({'result': balance['ont']}), 200
    elif asset_select == 'ONG':
        balance = sdk.rpc.get_balance(b58_address)
        return json.jsonify({'result': balance['ong']}), 200
    else:
        return json.jsonify({'result': 'query balance failed'}), 500


@app.route('/transfer', methods=['POST'])
def transfer():
    b58_to_address = request.json.get('b58_to_address')
    password = request.json.get('password')
    amount = int(request.json.get('amount'))
    try:
        b58_from_address = wallet_manager.get_default_account().get_address()
        from_acct = wallet_manager.get_account(b58_from_address, password)
        tx_hash = oep4.transfer(from_acct, b58_to_address, amount, from_acct, gas_limit, gas_price)
    except IndexError:
        return json.jsonify({'result': 'Please import an account'}), 400
    return json.jsonify({'result': tx_hash}), 200


@app.route('/transfer_multi', methods=['POST'])
def transfer_multi():
    transfer_array = request.json.get('transfer_array')
    password_array = request.json.get('password_array')
    args = json.loads(transfer_array)
    signers = list()
    for (item, password) in zip(args, password_array):
        account = wallet_manager.get_account(item[0], password)
        signers.append(account)
    tx_hash = oep4.transfer_multi(args, signers[0], signers, gas_limit, gas_price)
    return json.jsonify({'result': tx_hash}), 200


@app.route('/approve', methods=['POST'])
def approve():
    password = request.json.get('password')
    b58_spender_address = request.json.get('b58_spender_address')
    amount = request.json.get('amount')
    try:
        b58_from_address = wallet_manager.get_default_account().get_address()
        default_acct = wallet_manager.get_account(b58_from_address, password)
        tx_hash = oep4.approve(default_acct, b58_spender_address, amount, default_acct, gas_limit, gas_price)
    except IndexError:
        return json.jsonify({'result': 'Please import an account'}), 400
    return json.jsonify({'result': tx_hash}), 200


@app.route('/transfer_from', methods=['POST'])
def transfer_from():
    password = request.json.get('password')
    b58_spender_address = request.json.get('b58_spender_address')
    b58_from_address = request.json.get('b58_from_address')
    b58_to_address = request.json.get('b58_to_address')
    amount = int(request.json.get('amount'))
    spender = wallet_manager.get_account(b58_spender_address, password)
    tx_hash = oep4.transfer_from(spender, b58_from_address, b58_to_address, amount, spender, gas_limit, gas_price)
    return json.jsonify({'result': tx_hash}), 200


@app.route('/allowance', methods=['POST'])
def allowance():
    b58_owner_address = request.json.get('b58_owner_address')
    b58_spender_address = request.json.get('b58_spender_address')
    result = oep4.allowance(b58_owner_address, b58_spender_address)
    return json.jsonify({'result': result}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5001)
