const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
    },
    name: {
      first: {
        type: String,
        default: '',
      },
      last: {
        type: String,
        default: '',
      },
    },
    address: {
      type: String,
      required: false,
    },
    favoriteRestaurants: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }],
    favoriteFoods: [{ type: Schema.Types.ObjectId, ref: 'Food' }],
    roles: [
      {
        type: String,
        uppercase: true,
        trim: true,
        enum: [
          'ROLE_USER',
          'ROLE_ADMIN',
          'ROLE_DELIVERY_AGENT',
          'ROLE_RESTAURANT_ADMIN',
        ],
      },
    ],
    validated: {
      type: Boolean,
      default: false,
    },
    paymentCards: [{ type: Schema.Types.ObjectId, ref: 'PaymentCard' }],
  },
  {
    timestamps: true,
  },
);

userSchema.method('addPaymentCard', function (cardId) {
  if (!this.paymentCards.filter((id) => id == cardId).length)
    this.paymentCards.push(cardId);
});

userSchema.method('removePaymentCard', function (cardId) {
  this.paymentCards = this.paymentCards.filter((id) => id != cardId);
});

userSchema.method('addToFavoriteFoods', function (foodId) {
  if (!this.favoriteFoods.filter((id) => id == foodId).length)
    this.favoriteFoods.push(foodId);
});

userSchema.method('removeFromFavoriteFoods', function (foodId) {
  this.favoriteFoods = this.favoriteFoods.filter((id) => id != foodId);
});

userSchema.method('addToFavoriteRestaurants', function (restaurantId) {
  if (!this.favoriteRestaurants.filter((id) => id == restaurantId).length)
    this.favoriteRestaurants.push(restaurantId);
});

userSchema.method('removeFromFavoriteRestaurants', function (restaurantId) {
  this.favoriteRestaurants = this.favoriteRestaurants.filter(
    (id) => id != restaurantId,
  );
});

module.exports = mongoose.model('User', userSchema);
