Shortly.createSignupView = Backbone.View.extend({
  className: 'signup',

  template: Templates['signup'],

  events: {
  },

  render: function() {
    this.$el.html( this.template() );
    return this;
  }

});
