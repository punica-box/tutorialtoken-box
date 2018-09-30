new Vue({
    el: '#vue-app',
    data: function () {
        return {
            visible: false,
            privateKeyDialogVisible: false,
            newHexPrivateKey: '',
            eventInfoSelect: '',
            eventKey: '',
            assetSelect: '',
            assetKey: '',
            transferForm: {
                inputTransferTo: '',
                inputTransferAmount: '',
            },
            transferFormRules: {
                inputTransferTo: [
                    {required: true, message: 'To address can not be null', trigger: 'blur'},
                    {min: 34, max: 34, message: 'The length of to address should be 34', trigger: 'blur'}
                ],
                inputTransferAmount: [
                    {required: true, message: 'Transfer amount can not be null', trigger: 'blur'}
                ]
            },
            inputApproveSpender: '',
            inputApproveAmount: '',
            inputAllowanceOwner: '',
            inputAllowanceSpender: '',
            labelPosition: 'right',
            isSwitchToSettings: true,
            transferFromForm: {
                spenderAddress: '',
                fromAddress: '',
                toAddress: '',
                amount: ''
            },
            multiTransferForm: {
                toAddressArray: [{
                    value: ''
                }],
                fromAddressArray: [{
                    value: ''
                }],
                amountArray: [{
                    value: ''
                }]
            },
            settingForm: {
                networkOptions: [{
                    value: 'MainNet',
                    label: 'Main Network',
                }, {
                    value: 'TestNet',
                    label: 'Polaris Test Network'
                }, {
                    value: 'Localhost',
                    label: 'Localhost 20336'
                }],
                networkSelected: ['TestNet'],
                accountOptions: [],
                accountSelected: [],
                b58AddressSelected: ''
            }
        }
    },
    methods: {
        async submitMultiTransferForm(formName) {
            if (formName === "multiTransferForm") {
                let valid = await this.$refs[formName].validate();
                if (valid) {
                    let from = this.multiTransferForm.fromAddressArray;
                    let to = this.multiTransferForm.toAddressArray;
                    let amount = this.multiTransferForm.amountArray;
                    if (from.length !== to.length || from.length !== amount.length) {
                        this.$message({
                            message: 'Input mistake',
                            type: 'error',
                            duration: 2400
                        });
                        return
                    }
                    let transfer_array = [];
                    let password_array = [];
                    for (index in this.multiTransferForm.fromAddressArray) {
                        let password = await this.$prompt('Account Password', 'TransferMulti', {
                            confirmButtonText: 'OK',
                            cancelButtonText: 'Cancel',
                            inputPattern: /\S{1,}/,
                            inputErrorMessage: 'invalid password'
                        });
                        password = password.value;
                        let transfer = [from[index], to[index].value, Number(amount[index].value)];
                        transfer_array.push(transfer);
                        password_array.push(password);
                    }
                    try {
                        await this.$confirm('This will transfer token. Continue?', 'Warning', {
                            confirmButtonText: 'Confirm',
                            cancelButtonText: 'Cancel',
                            type: 'warning',
                            duration: 0
                        });
                    } catch (error) {
                        this.$message({
                            message: 'multi transfer canceled',
                            type: 'warning',
                            duration: 2400
                        });
                        return;
                    }
                    try {
                        let transfer_multi_url = Flask.url_for('transfer_multi');
                        let response = await axios.post(transfer_multi_url, {
                            'transfer_array': JSON.stringify(transfer_array),
                            'password_array': JSON.stringify(password_array)
                        });
                        let tx_hash = response.data.result;
                        if (tx_hash.length === 64) {
                            this.$message({
                                type: 'success',
                                message: 'Transfer successfully： '.concat(tx_hash).concat('!'),
                                duration: 2000
                            });
                        }
                        else {
                            this.$message({
                                type: 'error',
                                message: 'Transfer failed!',
                                duration: 800
                            });
                        }
                    }
                    catch (error) {
                        console.log(error);
                    }
                } else {
                    console.log('error submit!!');
                }
            }
        },
        resetMultiTransferForm(formName) {
            this.$refs[formName].resetFields();
        },
        removeTransfer(item) {
            let index = this.multiTransferForm.amountArray.indexOf(item);
            if (this.multiTransferForm.amountArray.length === 1) {
                return
            }
            if (index !== -1) {
                this.multiTransferForm.fromAddressArray.splice(index, 1);
                this.multiTransferForm.toAddressArray.splice(index, 1);
                this.multiTransferForm.amountArray.splice(index, 1);
            }
        },
        addTransfer() {
            let now_time = Date.now();
            this.multiTransferForm.fromAddressArray.push({
                value: '',
                key: now_time
            });
            this.multiTransferForm.toAddressArray.push({
                value: '',
                key: now_time
            });
            this.multiTransferForm.amountArray.push({
                value: '',
                key: now_time
            });
        },
        async queryBalance() {
            let query_balance_url = Flask.url_for("query_balance");
            let response = await axios.post(query_balance_url, {
                b58_address: this.assetKey,
                asset_select: this.assetSelect
            });
            this.$notify({
                title: 'Query Success',
                message: this.assetSelect.concat(' Balance: ', response.data.result),
                type: 'success'
            });
            console.log(response);
        },
        async getName() {
            try {
                let url = Flask.url_for("get_name");
                let response = await axios.get(url);
                this.$notify({
                    title: 'Token Name',
                    type: 'success',
                    message: response.data.result,
                    duration: 0
                });
            } catch (error) {
                console.log(error);
            }
        },
        async getSymbol() {
            try {
                let url = Flask.url_for("get_symbol");
                let response = await axios.get(url);
                this.$notify({
                    title: 'Token Symbol',
                    type: 'success',
                    message: response.data.result,
                    duration: 0
                });
            }
            catch (error) {
                console.log(error);
            }
        },
        async getDecimal() {
            try {
                let url = Flask.url_for("get_decimal");
                let response = await axios.get(url);
                this.$notify({
                    title: "Token Decimals",
                    type: 'success',
                    message: response.data.result,
                    duration: 0
                })
            } catch (error) {
                this.$notify({
                    title: "Token Decimals",
                    type: 'error',
                    message: 'query token decimals failed',
                    duration: 0
                });
            }
        },
        async getAccounts() {
            let url = Flask.url_for('get_accounts');
            let response = await axios.get(url);
            this.settingForm.accountOptions = [];
            for (let i = 0; i < response.data.result.length; i++) {
                this.settingForm.accountOptions.push({
                    value: response.data.result[i].b58_address,
                    label: response.data.result[i].label
                });
            }
        },
        async tabClickHandler(tab, event) {
            if (tab.label === 'DApp Settings') {
                if (this.isSwitchToSettings === true) {
                    await this.getAccounts();
                    this.isSwitchToSettings = false;
                    if (this.settingForm.accountSelected.length === 0 && this.settingForm.accountOptions.length !== 0) {
                        let firstB58Address = this.settingForm.accountOptions[0].value;
                        this.settingForm.accountSelected = [firstB58Address];
                        this.settingForm.b58AddressSelected = firstB58Address;
                    }
                }
            }
            else if (tab.label === 'Token TransferMulti') {
                this.isSwitchToSettings = true;
                await this.getAccounts();
            }
            else if (tab.label === 'Token TransferFrom') {
                this.isSwitchToSettings = true;
                await this.getAccounts();
            }
            else {
                this.isSwitchToSettings = true;
            }
        },
        async transferFrom() {
            let password = '';
            try {
                password = await this.$prompt('Account Password', 'Transfer', {
                    confirmButtonText: 'OK',
                    cancelButtonText: 'Cancel',
                    inputPattern: /\S{1,}/,
                    inputErrorMessage: 'invalid password'
                });
                password = password.value;
                await this.$confirm('This will transfer token. Continue?', 'Warning', {
                    confirmButtonText: 'Confirm',
                    cancelButtonText: 'Cancel',
                    type: 'warning',
                    duration: 0
                });
            } catch (error) {
                this.$message({
                    message: 'transfer canceled',
                    type: 'warning',
                    duration: 800
                });
                return;
            }
            let transfer_from_url = Flask.url_for('transfer_from');
            try {
                let response = await axios.post(transfer_from_url, {
                    password: password,
                    b58_spender_address: this.transferFromForm.spenderAddress,
                    b58_from_address: this.transferFromForm.fromAddress,
                    b58_to_address: this.transferFromForm.toAddress,
                    amount: Number(this.transferFromForm.amount)
                });
                let tx_hash = response.data.result;
                if (tx_hash.length === 64) {
                    this.$message({
                        type: 'success',
                        message: 'Transfer successfully： '.concat(tx_hash).concat('!'),
                        duration: 2000
                    });
                }
                else {
                    this.$message({
                        type: 'error',
                        message: 'Transfer failed!',
                        duration: 800
                    });
                }
            } catch (error) {
                console.log(error);
            }
        },
        async accountChange(value) {
            try {
                let url = Flask.url_for('account_change');
                let response = await axios.post(url, {'b58_address_selected': value[0]});
                this.settingForm.b58AddressSelected = value[0];
                this.$message({
                    type: 'success',
                    message: response.data.result,
                    duration: 1200
                });
            }
            catch (error) {
                this.$message({
                    message: error.response.data.result,
                    type: 'error',
                    duration: 2400
                })
            }
        },
        async importAccount() {
            let hex_private_key = await this.$prompt('Paste your private key string here:', 'Import Account', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
                inputPattern: /^[a-zA-Z0-9]{64}$/,
                inputErrorMessage: 'Cannot import invalid private key'
            }).catch(() => {
                this.$message.warning('Import canceled');
            });
            if (hex_private_key === undefined) {
                return;
            }
            let label = await this.$prompt('Account Label:', 'Import Account', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
            }).catch(() => {
                this.$message.warning('Import canceled');
            });
            if (label === undefined) {
                return;
            }
            let password = await this.$prompt('Account Password', 'Import Account', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel'
            }).catch(() => {
                this.$message.warning('Import canceled');
            });
            if (password === undefined) {
                return;
            }
            try {
                let import_account_url = Flask.url_for('import_account');
                let import_account_response = await axios.post(import_account_url, {
                    'hex_private_key': hex_private_key.value,
                    'label': label.value,
                    'password': password.value
                });
                await this.getAccounts();
                this.$message.success({
                    message: 'Import successful',
                    duration: 1200
                });
            }
            catch (error) {
                if (error.response.status === 409) {
                    this.$message({
                        message: error.response.data.result,
                        type: 'error',
                        duration: 2400
                    })
                }
            }
        },
        async removeAccount() {
            let password = '';
            try {
                password = await this.$prompt('Account Password', 'Remove Default Account', {
                    confirmButtonText: 'OK',
                    cancelButtonText: 'Cancel',
                    inputPattern: /\S{1,}/,
                    inputErrorMessage: 'invalid password'
                });
                password = password.value;
            } catch (error) {
                this.$message({
                    message: 'remove account canceled',
                    type: 'warning',
                    duration: 800
                });
            }
            try {
                let remove_account_url = Flask.url_for('remove_account');
                let response = await axios.post(remove_account_url, {
                    password: password,
                    b58_address_remove: this.settingForm.accountSelected[0],
                });
                await this.getAccounts();
                if (this.settingForm.accountSelected.length === 0 && this.settingForm.accountOptions.length !== 0) {
                    let firstB58Address = this.settingForm.accountOptions[0].value;
                    this.settingForm.accountSelected = [firstB58Address];
                    this.settingForm.b58AddressSelected = firstB58Address;
                }
                console.log(response);
                this.$message({
                    message: response.data.result,
                    type: 'success',
                    duration: 2400
                });
            } catch (error) {
                this.$message({
                    message: error.response.data.result,
                    type: 'error',
                    duration: 2400
                })
            }
        },
        async networkChange(value) {
            let msg = '';
            if (value[0] === 'MainNet') {
                msg = 'Connecting to Main Network'
            }
            else if (value[0] === 'TestNet') {
                msg = 'Connecting to Polaris Test Network'
            }
            else if (value[0] === 'Localhost') {
                msg = 'Connecting to Localhost'
            }
            else {
                return
            }
            let change_net_url = Flask.url_for('change_net');
            try {
                let response = await axios.post(change_net_url, {
                    network_selected: value[0]
                });
                this.$notify({
                    title: 'Network Change',
                    type: 'success',
                    message: msg,
                    duration: 2000
                });
            } catch (error) {
                this.settingForm.networkSelected = ['TestNet'];
                if (error.response.status === 400) {
                    this.$notify({
                        title: 'Network Change',
                        type: 'warning',
                        message: error.response.data.result,
                        duration: 2000
                    })
                }
                else if (error.response.status === 409) {
                    this.$notify({
                        title: 'Network Change',
                        type: 'warning',
                        message: error.response.data.result,
                        duration: 2000
                    })
                }
                else if (error.response.status === 500) {
                    this.$notify({
                        title: 'Network Change',
                        type: 'warning',
                        message: error.response.data.result,
                        duration: 2000
                    })
                }
                else if (error.response.status === 501) {
                    this.$notify({
                        title: 'Network Change',
                        type: 'warning',
                        message: error.response.data.result,
                        duration: 2000
                    })
                }
                else {
                    this.$notify({
                        title: 'Network Change',
                        type: 'error',
                        message: 'Failed',
                        duration: 2000
                    })
                }
            }
        },
        async transfer() {
            if (this.transferForm.inputTransferAmount > 0) {
                let password = '';
                try {
                    password = await this.$prompt('Account Password', 'Transfer', {
                        confirmButtonText: 'OK',
                        cancelButtonText: 'Cancel',
                        inputPattern: /\S{1,}/,
                        inputErrorMessage: 'invalid password'
                    });
                    password = password.value;
                    await this.$confirm('This will transfer token. Continue?', 'Warning', {
                        confirmButtonText: 'Confirm',
                        cancelButtonText: 'Cancel',
                        type: 'warning',
                        duration: 0
                    });
                } catch (error) {
                    this.$message({
                        message: 'transfer canceled',
                        type: 'warning',
                        duration: 800
                    });
                    return;
                }
                try {
                    let url = Flask.url_for("transfer");
                    let response = await axios.post(url, {
                        password: password,
                        b58_to_address: this.transferForm.inputTransferTo,
                        amount: this.transferForm.inputTransferAmount
                    });
                    let tx_hash = response.data.result;
                    if (tx_hash.length === 64) {
                        this.$message({
                            type: 'success',
                            message: 'Transfer successfully： '.concat(tx_hash).concat('!'),
                            duration: 2000
                        });
                    }
                    else {
                        this.$message({
                            type: 'error',
                            message: 'Transfer failed!',
                            duration: 800
                        });
                    }
                } catch (error) {
                    if (error.response.status === 400) {
                        this.$notify({
                            title: 'Transfer failed!',
                            message: error.response.data.result,
                            duration: 800
                        })
                    }
                }
            }
            else {
                this.$notify({
                    title: "Amount Error",
                    type: 'warning',
                    message: "Please input the amount value great than 0.",
                    duration: 800
                });
            }
        },
        async allowance() {
            if (this.inputAllowanceSpender.length === 0) {
                this.$notify({
                    title: 'Allowance Error',
                    type: 'error',
                    message: 'Please input the spender address',
                    duration: 1200
                });
                return;
            }
            if (this.inputAllowanceOwner.length === 0) {
                this.$notify({
                    title: 'Allowance Error',
                    type: 'error',
                    message: 'Please input the owner address',
                    duration: 1200
                });
                return;
            }
            if (this.inputAllowanceOwner.length === 34 && this.inputAllowanceSpender.length === 34) {
                try {
                    let url = Flask.url_for("allowance");
                    let response = await axios.post(url, {
                        b58_owner_address: this.inputAllowanceOwner,
                        b58_spender_address: this.inputAllowanceSpender
                    });
                    if (response.data.result === 0) {
                        this.$notify({
                            title: 'Allowance',
                            type: 'success',
                            message: '0',
                            duration: 0
                        });
                    }
                    else {
                        this.$notify({
                            title: 'Allowance',
                            type: 'success',
                            message: response.data.result,
                            duration: 0
                        });
                    }
                } catch (error) {
                    this.$notify({
                        title: 'Allowance',
                        type: 'error',
                        message: 'query allowance failed',
                        duration: 1200
                    });
                }
            }
            else {
                this.$notify({
                    title: "Transfer Error",
                    type: 'error',
                    message: "Please input the correct base58 encode address.",
                    duration: 1200
                });
            }
        },
        async approve() {
            let password = await this.$prompt('Account Password', 'Approve', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
                inputPattern: /\S{1,}/,
                inputErrorMessage: 'invalid password'
            }).catch(() => {
                this.$message.warning('Approve canceled');
            });
            try {
                let approve_url = Flask.url_for('approve');
                let response = await axios.post(approve_url, {
                    'password': password.value,
                    'b58_spender_address': this.inputApproveSpender,
                    'amount': Number(this.inputApproveAmount)
                });
                let tx_hash = response.data.result;
                this.$message({
                    type: 'success',
                    message: 'TxHash： '.concat(tx_hash).concat('!'),
                    duration: 2000
                });
            } catch (error) {
                console.log(error);
            }
        },
        async createAccount() {
            let label = await this.$prompt('Account Label:', 'Import Account', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
                inputPattern: /\S{1,}/,
                inputErrorMessage: 'invalid label'
            }).catch(() => {
                this.$message.warning('Import canceled');
            });
            if (label === undefined) {
                return;
            }
            let password = await this.$prompt('Account Password', 'Import Account', {
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
                inputPattern: /\S{1,}/,
                inputErrorMessage: 'invalid password'
            }).catch(() => {
                this.$message.warning('Import canceled');
            });
            if (password === undefined) {
                return;
            }
            try {
                let create_account_url = Flask.url_for('create_account');
                let response = await axios.post(create_account_url, {
                    'label': label.value,
                    'password': password.value
                });
                this.newHexPrivateKey = response.data.hex_private_key;
                this.privateKeyDialogVisible = true;
                await this.getAccounts();
            } catch (error) {
                console.log(error);
            }
        },
        async queryEvent() {
            if (this.eventInfoSelect === "") {
                this.$notify({
                    title: 'Query Event Error',
                    type: 'warning',
                    message: 'Please select an event information you want to query.',
                    duration: 800
                });
                return;
            }
            if (this.eventKey.length === 0) {
                this.$notify({
                    title: 'TxHash Error',
                    type: 'error',
                    message: 'Please input TxHash',
                    duration: 800
                });
                return;
            }
            if (this.eventKey.length === 64) {
                let get_smart_contract_event_url = Flask.url_for("get_smart_contract_event");
                try {
                    let response = await axios.post(get_smart_contract_event_url, {
                        tx_hash: this.eventKey,
                        event_info_select: this.eventInfoSelect
                    });
                    let result = response.data.result;
                    if (result.length === 0) {
                        this.$message({
                            message: 'query failed!',
                            type: 'error',
                            duration: 800
                        })
                    }
                    else {
                        if (this.eventInfoSelect === 'Notify') {
                            this.$alert(result, 'Query Result', {
                                confirmButtonText: 'OK',
                                type: 'success'
                            });
                        } else {
                            this.$notify({
                                title: 'Query Result',
                                type: 'success',
                                message: result,
                                duration: 0
                            });
                        }
                    }
                }
                catch (error) {
                    this.$message({
                        message: 'query failed!',
                        type: 'error',
                        duration: 800
                    });
                }
            }
        },
    }
});
