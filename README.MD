# JS Binding Library - Basic

Purposes to the development and writing of this code originally was to develop a small lightweight VueJS like library, which could be implemented into work projects, this was because they refused to allow libraries that were not self developed within their architecture.  

This was developed over a few years and had been shelved for about 4 years, I had a wild hair popped in and I started working on it again. Let me be clear this is in no way better than a stable and supported library but it was a pretty cool challenge to work out some of the bugs left off in the code form the get go.

This library has currently the support for one and two-way data bindings, 'for as' loops and a simple if statement parser. 

Requires: ```bindable.js``` file and the following CSS:

```css 
/* hides template elements and is used for show/hiding if statements */
[role="template"], .d-none {
    display: none;
}
```
## If statements

at this time (I'll call it v.1) if statements are simple and do have some rules:
1. The data value being tested must be the first or the left most argument in the if condition.
2. Only one data value should be used per page for each (having multiple  data values checked for if statements isn't supported yet.)
3. if you change the value of the property being checked you need to run either rebind (not preferable) or update on the bindable instances like so:

    ```html
        <!-- this whole div is hidden from view when the if statement is false, it is still technically rendered though. -->
        <div jf-if="showMe == true">
            <h1>Hello World</h1>
        </div>
    ``` 

    ```js
        let app = {
            data: {
                showMe: true,
                ...
            },
            methods: {
                click: {...},
                ...
            }
        } 
        const myApp = new App(app);
        ...
        app.data.showMe = false;
        // rebind re renders all of the bindings to the data objects... if oll you need is to update the if statements use the update function. 
        myApp.rebind(); // NOT RECOMMENDERD for if statement updates! 
        // the update function takes a minimum of 1 arg the data value to look for, has options for firing an event (very useful) and also updating properties (not as likely to be used)
        myApp.update('showMe', true, 'change'); // runs the if statement that handles the showMe if... not the whole page.
    ```
You can also add a button and attach a static click event (we'll cover this in a bit) to it

```html
    <div>
         <button jf-click="toggle" jf-event="static">Toggle Me</button>
         <!-- this whole div is hidden from view when the if statement is false, it is still technically rendered though. -->
         <div jf-if="showMe == true">
             <h1>Hello World</h1>
         </div>
    </div>
```

```js
     let app = {
         data: {
             showMe: true
         },
         methods: {
             click: {
                 toggle: (event) => {
                     app.data.showMe = !app.data.showMe;
                     myApp.update('showMe', true, 'change'); // runs the if statement that handles the showMe if... not the whole page.
                 }
             }
         }
     } 
     const myApp = new App(app); 
```

## Events, Props, Static v Not Static

Talking about events... there are at this point (v.1) events that we established on this program that are statically set and ones that get modified when rebind() is called on the page. Static event placements are not affected.
Methods can be any event. in the above code sample click method is set, with a handler called toggle, and on the html element that we want to click we have added the jf-click attribute, to make an event static, add the 
jf-event="static" attribute and the method will be skipped when rebind is called.
All event handlers must have as the first argument the e or event object. you can pass additional arguments by using ```jf-props=""``` attribute, separate arg values with a <kbd>,</kbd>. Arguments are passed in the order 
they are in props. You can define data from the data values using dot notation to path to the value you want. see the example below: 

```html
<h1 jf-click="greet" jf-props="person.name,person.age" jf-event="static">Greetings! (click to show it works).</h1>
```

```js
// this is the greet method from within the app.method.click object 
greet: (event, name, age) => {
   let resolvedName = myApp.resolve(event.detail.name);
   let resolvedAge = myApp.resolve(event.detail.age);
   alert(`Hello ${resolvedName}! You are ${resolvedAge} years old!`);
}
```
```js
// in app.data object you have person
person: {
	name: 'Jesse', age: 40 // or 1,000
}
```

You'll note that the arguments in the handler are not passed to the handler directly. one of those mysterious things. It is due to having the handlers attached and data too just the way they are. Not likely going to change soon if ever. 
You access the argument variables and values using the event.details which is tha object that gets attached to the event. 

## One-way binding

One way binging is pretty straight forward. Re bind the data property to the HTML element using the ```jf-bind``` attribute. If pointing to nested properties then use dot notation to navigate to the value.
```html
<label for="observable-input" style="display:block;">My name is:: <span jf-bind="person.name"></span>
```
Of course, you need to have the property in the bound data object...: 
```js
let app = {
	data: {
		person: {
			name: 'Jesse',
			age: 400
		}
	}
}
```

## Two-way binding / Model binding

Two-way or Model binding is very similar to the one-way binding above, so much so that we will refer to the JS and HTML to the code there here.
You just need an input of some sort like the below example: 
```html
<input type="text" name="observable-input" id="observable-input" jf-model="person.name">
```
Note the difference here, we are using ```jf-model``` attribute and not ```jf-bind```. The model is then bound to the data property (in this case person.name) and an input and change handler are attached. 
You do not need to and really should not attach any additional handlers to the model elements. The data property is updated as you type or change the text or value. If you have the property bound elsewhere it will also 
update and there is not really a reason to call rebind() method on the App instance.

## For Loops
This is where it starts getting a bit more tricky, so I saved this for last (at least in this version).
for loops require a specific layout for the attribute. Take a look at the following HTML example of static data:  
```html
<h1>For loop</h1>
<table>
	<thead>
		<tr>
			<th>Task Id</th>
			<th>Task Name</th>
			<th>Task Completed</th>
			<th>Task Added By</th>
		</tr>
	</thead>
	<tbody jf-for="tasks as task">
		<tr role="template">
			<td jf-bind="id"></td>
			<td jf-bind="name"></td>
			<td jf-bind="completed"></td>
			<td jf-bind="addedby.name"></td>
		</tr>
	</tbody>
</table>
```
The table body element has a ```jf-for``` attribute with a value of a loopable data property as item <kbd>tasks as task</kbd> and in the bound data there is an array (loopable) called <kbd>tasks</kbd>
```js
 let app = {
     data: {
         tasks: [
             {
                 id: 1,
                 name: "Do something",
                 completed: false,
                 addedby: {
                     name: 'Jesse F'
                 }
             },
             {
                 id: 2,
                 name: "Do something else",
                 completed: false,
                 addedby: {
                     name: 'Jesse F'
                 }
             },
             {
                 id: 3,
                 name: "Do another something",
                 completed: false,
                 addedby: {
                     name: 'Jesse F'
                 }
             },
         ]
     }
 }
```
Take note now that there is a table row element with the attribute ```role="tempmlate"``` and the table cells are bound to properties in the tasks >>> task item. When run the program will iterate over the tasks array
take a copy of the template element and bind the values of each task property for each task in the array tasks. Note that deeper properties can be still access by the dot notation. You are also able to inline the template 
take the following examples:
```html
<h1>For loop </h1>
<span><button jf-click="createTodo" jf-event="static">Add ToDo</button></span>
<ul style="list-style: none" jf-for="todos as todo">

	<li role="template">
		<span jf-bind=""></span>
		<button jf-click="deleteTodo" jf-props="this.parentElement.querySelector('span').innerHTML">&times;</button>
	</li>
</ul>


<h1>For loop inline template</h1>
<span><button jf-click="createTodo1" jf-event="static">Add ToDo</button></span>
<ul style="list-style: none" jf-for="todos1 as todo" jf-template="<li><span jf-bind=''></span><button jf-click='deleteTodo1' jf-props='this.parentElement.querySelector(&quot;span&quot;).innerHTML'>&times;</button></li>"></ul>
```
These do a very similar thing, they create an element from a template and append them to the parent element. The inline however is meant and is better suited to simple html tasks. 
They can get complex and become both hard to read and prone to errors if you do not properly encode html and special characters specifically quotes and apostrophes as had to be done in the example above. Also note when you 
have a list of array values that are not objects using ```jf-bind=""``` will correctly bind the value to the element.


[!WARNING]
When doing any modification to the for>>as elements you must rerun binding or it will not reattach the handlers and may cause unexpected results.

There are plans to work out a way to use the update method available on the App instance but as of right now the for loop must use the ```(App instance).rebind();```

## Nesting for loops...

I have added functionality to handle nested for loops. at this time it only allows one additional for loop. Some caveats:

1. The data for the for loop must be solely under the parent data object or it will not work.
2. You really should be cautious about the HTML structure that is used especially when it comes to nested HTML elements from the parent row to the nested for loop container. For instance don't nest tables with in tables ... so on and so forth.
3. If you're using nested for loops, then you probably shouldn't override the default for loop process, or at the lease look at what is happening so you can include it in your override.

When nesting for loops, the inner loop should reference the parent object like in the following code example: 
```html
<h1>For loop nested for loops</h1>
<table>
	<thead>
       <tr>
           <th>Book Id</th>
           <th>Book Name</th>
           <th>Book Published</th>
           <th>People Involved</th>
       </tr>
	</thead>
	<tbody jf-for="testQbjNestArray as book">
       <tr role="template">
           <td jf-bind="id"></td>
           <td jf-bind="name"></td>
           <td jf-bind="published"></td>
           <td>
               <ul style="list-style: none" jf-for="book.people as person">
                   <li role="template">
                       <span>name: <span jf-bind="name"></span>&nbsp;&nbsp;</span>
                       <span>age: <span jf-bind="age"></span>&nbsp;&nbsp;</span>
                       <span>title: <span jf-bind="role"></span></span>
                   </li>
               </ul>
           </td>
       </tr>
	</tbody>
</table>
```
And this is the bound object being referenced:
```js
testQbjNestArray: [
    {
        id:1,
        name:'Test Object 1',
        published: "7/18/2000",
        people: [
            {
                name: 'John Doe',
                age: 25,
                role: 'Author'
            },
            {
                name: 'Anne Doe',
                age: 35,
                role: 'Editor'
            },
            {
                name: 'Harry Smith',
                age: 55,
                role: 'Book Agent'
            }
        ]
    },
    {
        id:2,
        name:'Test Object 2',
        published: "5/30/2025",
        people: [
            {
                name: 'John Doe',
                age: 50,
                role: 'Author'
            },
            {
                name: 'Anne Doe',
                age: 60,
                role: 'Editor'
            },
            {
                name: 'Harry Smith II',
                age: 45,
                role: 'Book Agent'
            }
        ]
    }
]
```