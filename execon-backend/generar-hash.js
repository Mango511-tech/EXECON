const bcrypt = require('bcrypt');

const contrasenaEnTextoPlano = 'Admin'; 

bcrypt.hash(contrasenaEnTextoPlano, 10).then(hash => {
  console.log('Tu hash es:');
  console.log(hash);
});