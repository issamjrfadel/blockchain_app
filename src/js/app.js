App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    // Load pets.
    $.getJSON('../pets.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (i = 0; i < data.length; i ++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);
    
      // Set the provider for our contract
      App.contracts.Adoption.setProvider(App.web3Provider);
    
      // Use our contract to retrieve and mark the adopted pets
      return App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
  },

  markAdopted: function(adopters, account) {
    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;

      return adoptionInstance.getAdopters.call();
      
    }).then(function(adopters) {
      console.log(adopters);

      for (i = 0; i < adopters.length; i++) {
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
        }
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data('id'));

    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
    
      var account = accounts[0];

      var access_level;

      found = false;
    // Load eth addresses.
    $.getJSON('../address.json', function(data) {

      for (i = 0; i < data.length; i ++) {
        //check if the address of user is stored in json file
        if(data[i].address.toLowerCase() == account){
          //if it is retrieve users access level
          access_level = data[i].access_level;
          //load pets json.
          $.getJSON('../pets.json', function(data) {
      
            for (i = 0; i < data.length; i ++) {
              //check if the pet the user wants to adopt is stored in json file
              if(data[i].id == petId){
                //if the user access level is greater than or equal to required pet access level then allow them to adopt
                  if(access_level >= data[i].access_level){

                    App.contracts.Adoption.deployed().then(function(instance) {
                      adoptionInstance = instance;
                      // Execute adopt as a transaction by sending account
                      return adoptionInstance.adopt(petId, {from: account});
                    }).then(function(result) {
                      return App.markAdopted();
                    }).catch(function(err) {
                      console.log(err.message);
                    });
                    break;
                  }
                  else{
                    //if their access level isn't high enough stop adoption
                    alert("cannot adopt this pet");
                    break;
                  }
              }
            }
          });
        }
      }
    });

    });
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
