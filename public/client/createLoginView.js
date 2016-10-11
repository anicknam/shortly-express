Shortly.createLoginView = Backbone.View.extend({
  className: 'login',

  template: Templates['login'],

  events: {
  },

  render: function() {
    console.log(Templates);
    this.$el.html( this.template() );
    return this;
  }

});
