import { fileToBase64 } from "./utils/index.mjs";
import {
    scrollToBottom,
    scrollInputsIntoView
} from "./utils/index.mjs";
import { initializeWebSocket } from "./utils/index.mjs";
import { fetchPerformers } from "./utils/index.mjs";
import { getQueryParameter } from "./utils/index.mjs";
import { getUserData } from "./utils/index.mjs";
import { showModal } from "./utils/index.mjs";

window.onload = async function () {
    window.Telegram.WebApp.disableVerticalSwipes()

    const telegramID = getQueryParameter('telegram_id');
    if (telegramID) {
        try {
            const userData = await getUserData(telegramID);
            const validatedTelegramID = userData.userData.telegram_id;
            const role = userData.userData.delivery_role;
            const socket = initializeWebSocket(validatedTelegramID);

            if (role === 'customer') {
                setupCustomerInterface(validatedTelegramID, userData, socket);
            } else {
                setupCourierInterface(validatedTelegramID, userData, socket);
            };
        } catch (error) {
            console.error(`Error in window.onload: ${error}`);
        };
    };

    // Ensure that the keyboard is closed when the user touches the screen outside of input elements
    document.addEventListener('touchstart', (event) => {
        if (!event.target.closest('input, textarea, select')) {
            document.activeElement.blur();
        };
    });
};


function setupCustomerInterface(validatedTelegramID, userData, socket) {
    const name = userData.userData.delivery_name;
    const registrationDate = userData.userData.delivery_registration_date;

    insertCustomerButtons(name, registrationDate);

    const createBidButton = document.getElementById('create-bid');
    createBidButton.addEventListener('click', async function () {
        await showCreateBidForm();

        // Attach submit form event listener
        const createBidForm = document.getElementById('create-bid-form');
        if (createBidForm) {
            createBidForm.addEventListener('submit', function (event) {
                handleBidFormSubmit(event, validatedTelegramID, name);
            });
        };
    });

    const myBidsButton = document.getElementById('my-bids');
    myBidsButton.addEventListener('click', async function () {
        await showMyBids(validatedTelegramID);
    });

    const lookChatsButton = document.getElementById('look-chats');
    lookChatsButton.addEventListener('click', async function () {
        const display = document.getElementById('display');
        display.classList.remove('view-mode');

        await showCustomerChats(validatedTelegramID, name, socket);
    });
};


function setupCourierInterface(validatedTelegramID, userData, socket) {
    const name = userData.userData.delivery_name;
    const dateOfBirth = userData.userData.date_of_birth;
    const hasCar = userData.userData.has_car;
    const carModel = userData.userData.car_model;
    const carDimensionsWidth = userData.userData.car_dimensions_width;
    const carDimensionsLength = userData.userData.car_dimensions_length;
    const carDimensionsHeight = userData.userData.car_dimensions_height;
    const registrationDate = userData.userData.delivery_registration_date;

    insertCourierButtons(
        name,
        dateOfBirth,
        hasCar,
        carModel,
        carDimensionsWidth,
        carDimensionsLength,
        carDimensionsHeight, 
        registrationDate
    );

    const searchBidsButton = document.getElementById('search-bids');
    searchBidsButton.addEventListener('click', async function () {
        await showSelectCityForm();

        // Attach submit form event listener
        const selectCityForm = document.getElementById('select-city-form');
        if (selectCityForm) {
            selectCityForm.addEventListener('submit', async function (event) {
                await handleCityFormSubmit(event, validatedTelegramID);
            });
        };
    });

    const lookChatsButton = document.getElementById('look-chats');
    lookChatsButton.addEventListener('click', async function () {
        const display = document.getElementById('display');
        display.classList.remove('view-mode');

        await showCourierChats(validatedTelegramID, name, socket);
    });
};


function insertCustomerButtons(name, registrationDate) {
    const headerNav = document.getElementById('header-nav');
    const headerInfo = document.getElementById('header-user-info');

    if (!headerNav || !headerInfo) {
        console.error('Header navigation element not found');
        return;
    } else {
        try {
            headerInfo.innerHTML = `Заказчик ${name}. Зарегистрирован ${registrationDate}.`;

            const createBidButton = document.createElement('button');
            createBidButton.className = 'header-button';
            createBidButton.id = 'create-bid';
            createBidButton.textContent = 'Опубликовать новый заказ 🏷️';

            const myBidsButton = document.createElement('button');
            myBidsButton.className = 'header-button';
            myBidsButton.id = 'my-bids';
            myBidsButton.textContent = 'Просмотреть мои заказы 📂';

            const lookChatsButton = document.createElement('button');
            lookChatsButton.className = 'header-button';
            lookChatsButton.id = 'look-chats';
            lookChatsButton.textContent = 'Переписки по активным заказам 📩';

            headerNav.appendChild(createBidButton);
            headerNav.appendChild(myBidsButton);
            headerNav.appendChild(lookChatsButton);
        } catch (error) {
            console.error(`Error in insertCustomerButtons: ${error}`);
        };
    };
};


function insertCourierButtons(
    name,
    dateOfBirth,
    hasCar,
    carModel,
    carDimensionsWidth,
    carDimensionsLength,
    carDimensionsHeight,
    registrationDate
) {
    const headerNav = document.getElementById('header-nav');
    const headerInfo = document.getElementById('header-user-info');

    if (!headerNav || !headerInfo) {
        console.error('Header navigation element not found');
        return;
    } else {
        try {
            headerInfo.innerHTML = `Курьер ${name}. Дата рождения: ${dateOfBirth}.
            Есть автомобиль: ${hasCar ? 'да' : 'нет'} ${carModel}.
            Габариты автомобиля: ${carDimensionsWidth}x${carDimensionsLength}x${carDimensionsHeight}.
            Зарегистрирован ${registrationDate}`;

            const searchBidsButton = document.createElement('button');
            searchBidsButton.className = 'header-button';
            searchBidsButton.id = 'search-bids';
            searchBidsButton.textContent = 'Искать заказы 🔎';

            const lookChatsButton = document.createElement('button');
            lookChatsButton.className = 'header-button';
            lookChatsButton.id = 'look-chats';
            lookChatsButton.textContent = 'Переписки по активным заказам 📨';

            headerNav.appendChild(searchBidsButton);
            headerNav.appendChild(lookChatsButton);
        } catch (error) {
            console.error(`Error in insertPerformerButtons: ${error}`);
        };
    };
};


async function showCreateBidForm() {
    const display = document.getElementById('display');
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';

            const response = await fetch('../templates/create_delivery_form.html');

            if (!response.ok) {
                display.textContent = 'Произошла ошибка при загрузке формы создания заказа, попробуйте перезайти в приложение';
                console.error('Failed to load create_delivery_form.html');
            } else {
                const formHTML = await response.text();

                display.innerHTML = formHTML;

                scrollInputsIntoView();
            };
        } catch (error) {
            console.error(`Error in showCreateBidForm: ${error}`);
        };
    };
};


function handleBidFormSubmit(event, validatedTelegramID, name) {
    event.preventDefault();

    const description = document.getElementById('description-textarea');
    const deliverFrom = document.getElementById('deliver-from');
    const deliverTo = document.getElementById('deliver-to');
    const carNecessary = document.querySelector('input[name="car-necessary"]:checked');

    // Check if the fields are valid
    if (!description.value || !deliverFrom.value || !deliverTo.value || !carNecessary) {
        showModal('Пожалуйста, заполните всю форму.');
        return;
    } else {
        const data = {
            customer_telegram_id: validatedTelegramID,
            customer_name: name,
            city: city.value,
            description: description.value,
            deliver_from: deliverFrom.value,
            deliver_to: deliverTo.value,
            car_necessary: carNecessary.value
        };

        fetch('/delivery/post-bid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                showModal(data.message)
            })
            .catch((error) => {
                console.error('Error:', error);
                showModal('Произошла ошибка при создании заказа. Попробуйте позже.');
            });
    };
};


async function showMyBids(validatedTelegramID) {
    const display = document.getElementById('display');
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';

            const response = await fetch('/delivery/my-bids', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customer_telegram_id: validatedTelegramID })  // Send the Telegram ID as JSON
            });

            if (!response.ok) {
                showModal('Произошла ошибка при загрузке списка заказов, попробуйте перезайти в приложение');
                throw new Error('Failed to load my-bids');
            };

            const { success, bids } = await response.json();

            if (success && bids.length > 0) {
                const bidsContainer = document.createElement('div');
                bidsContainer.classList.add('bids-container');

                bids.forEach((bid) => {
                    const bidCard = document.createElement('div');
                    bidCard.classList.add('bid-card');

                    bidCard.innerHTML = `
                        <h3>Заказ #${bid.id}</h3>
                        <br>
                        <p>Город: ${bid.city}</p>
                        <br>
                        <p>Что нужно доставить, описание: ${bid.description}</p>
                        <br>
                        <p>Откуда: ${bid.deliver_from}</p>
                        <p>Куда: ${bid.deliver_to}</p>
                        <br>
                        <p>Нужна машина: ${(bid.car_necessary === 1) ? 'Да' : 'Нет'}</p>
                        <button class="bid-card-button" data-bid-id="${bid.id}">Закрыть заказ 🔐</button>
                    `;

                    const closeBidButton = bidCard.querySelector('.bid-card-button');
                    closeBidButton.addEventListener('click', async (event) => {
                        const bidID = event.target.getAttribute('data-bid-id');

                        if (bidID) {
                            const confirmation = confirm('Вы уверены, что хотите закрыть заказ?');
                            if (confirmation) {
                                try {
                                    const response = await fetch('/close-delivery-bid', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ bid_id: bidID })  // Send the Telegram ID as JSON
                                    });

                                    if (!response.ok) {
                                        showModal('Произошла ошибка при закрытии заказа, попробуйте перезайти в приложение');
                                        console.error('Failed to close bid');
                                    } else {
                                        const { success, message } = await response.json();
                                        if (success) {
                                            showModal(message);
                                            showMyBids(validatedTelegramID);
                                        };
                                    };
                                } catch (error) {
                                    console.error(`Error in close-delivery-bid: ${error}`);
                                };
                            };
                        };
                    });
                    bidsContainer.appendChild(bidCard);
                });
                display.appendChild(bidsContainer);
            } else {
                display.innerHTML = `<p>У вас нет активных заказов</p>`;
            };
        } catch (error) {
            console.error(`Error in showMyBids: ${error}`);
        };
    };
};


async function showSelectCityForm() {
    const display = document.getElementById('display');
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';

            const response = await fetch('../templates/select_city.html');

            if (!response.ok) {
                showModal('Произошла ошибка при загрузке списка заказов, попробуйте перезайти в приложение');
                console.error('Failed to load select_city.html');
            };

            const formHTML = await response.text();

            display.innerHTML = formHTML;
        } catch (error) {
            console.error(`Error in showSelectCityForm: ${error}`);
        };
    };
};


async function handleCityFormSubmit(event, validatedTelegramID) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const city = formData.get('city');

    if (city) {
        await showBids(city, validatedTelegramID);
    };
};


async function showBids(city, validatedTelegramID) {
    const display = document.getElementById('display');
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';

            const response = await fetch('/delivery/get-bids', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ city: city })  // Send the city as JSON
            });

            if (!response.ok) {
                showModal('Произошла ошибка при загрузке списка заказов, попробуйте перезайти в приложение');
                console.error('Failed to load bids');
            };

            const bidsResponse = await response.json();

            if (bidsResponse && bidsResponse.bids.length > 0) {
                const bidsContainer = document.createElement('div');
                bidsContainer.classList.add('bids-container');

                bidsResponse.bids.forEach(bid => {
                    const bidCard = document.createElement('div');
                    bidCard.classList.add('bid-card');

                    bidCard.innerHTML = `
                        <p>Заказчик: ${bid.customer_name}</p>
                        <br>
                        <p>Что нужно доставить, описание: ${bid.description}</p>
                        <br>
                        <p>Откуда: ${bid.deliver_from}</p>
                        <p>Куда: ${bid.deliver_to}</p>
                        <br>
                        <p>Нужна машина: ${(bid.car_necessary === 1) ? 'Да' : 'Нет'}</p>
                        <button id="respond-to-bid" class="bid-card-button" data-bid-id="${bid.id}">Откликнуться ☑️</button>
                        <button id="look-chats" class="bid-card-button">Посмотреть переписки заказчика 📤</button>
                    `;

                    bidCard.querySelector('#respond-to-bid').addEventListener('click', async (event) => {
                        const bidID = event.target.getAttribute('data-bid-id');

                        if (bidID) {
                            try {
                                fetch('/respond-to-delivery-bid', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ bid_id: bidID, performer_telegram_id: validatedTelegramID })
                                })
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.success) {
                                            showModal(data.message);
                                            showBids(city, validatedTelegramID);
                                        };
                                    })
                                    .catch(error => {
                                        console.error(`Error in respond-to-delivery-bid: ${error}`);
                                        showModal('Произошла ошибка при отклике на заказ, попробуйте перезайти в приложение');
                                    });
                            } catch (error) {
                                console.error(`Error in respond-to-delivery-bid: ${error}`);
                                showModal('Произошла ошибка при отклике на заказ, попробуйте перезайти в приложение');
                            };
                        };
                    });

                    bidCard.querySelector('#look-chats').addEventListener('click', async (event) => {
                        const customerTelegramID = bid.customer_telegram_id

                        if (customerTelegramID) {
                            await showCustomerChatsWithCouriers(customerTelegramID);
                        } else {
                            showModal('Произошла ошибка при загрузке переписки, попробуйте перезайти в приложение');
                            console.error('Customer Telegram ID not found');
                        };
                    });

                    bidsContainer.appendChild(bidCard);
                });
                display.appendChild(bidsContainer);
            } else {
                display.innerHTML = `<p>В данном городе нет активных заказов</p>`;
            };
        } catch (error) {
            console.error(`Error in showBids: ${error}`);
        };
    };
};


function showCustomerChatsWithCouriers(customerTelegramID) {
    const display = document.getElementById('display');
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';
            display.innerHTML = 'Загрузка...';
            fetch('/delivery/show-customer-chats-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customer_telegram_id: customerTelegramID })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success && Array.isArray(data.bids)) {
                        display.innerHTML = '';

                        const bidsContainer = document.createElement('div');
                        bidsContainer.classList.add('bids-container');

                        data.bids.forEach(bid => {
                            const bidCard = document.createElement('div');
                            bidCard.classList.add('bid-card');

                            bidCard.innerHTML = `
                            <p>Номер заказа: ${bid.id}</p>
                            <p>Город: ${bid.city}</p>
                            <p>Что нужно доставить, описание: ${bid.description}</p>
                            <p>Откуда: ${bid.deliver_from}</p>
                            <p>Куда: ${bid.deliver_to}</p>
                            <p>Нужна машина: ${(bid.car_necessary === 1) ? 'Да' : 'Нет'}</p>
                            <br><br>
                        `;

                            bid.responses.forEach((response) => {
                                const responseDetails = `
                                <div class="response-container">
                                    <p>Откликнулся: ${response.courier_name}</p>
                                    <p>Дата рождения: ${response.courier_date_of_birth}</p>
                                    <p>Есть ли машина: ${response.courier_has_car}</p>
                                    <p>Габариты машины: ${response.courier_car_dimensions}</p>
                                </div>
                            `;

                                const lookChatButton = document.createElement('button');
                                lookChatButton.classList.add('bid-card-button');
                                lookChatButton.innerHTML = 'Посмотреть переписку 👀';
                                lookChatButton.setAttribute('data-bid-id', bid.id);
                                lookChatButton.setAttribute('data-customer-telegram-id', customerTelegramID);
                                lookChatButton.setAttribute('data-courier-telegram-id', response.courier_telegram_id);

                                lookChatButton.addEventListener('click', async (event) => {
                                    const bidID = event.target.getAttribute('data-bid-id');
                                    const customerTelegramID = event.target.getAttribute('data-customer-telegram-id');
                                    const courierTelegramID = event.target.getAttribute('data-courier-telegram-id');
                                    if (bidID && customerTelegramID && courierTelegramID) {
                                        await showSelectedCustomerChat(bidID, customerTelegramID, courierTelegramID);
                                    } else {
                                        showModal('Произошла ошибка при загрузке переписки, попробуйте перезайти в приложение.');
                                        console.error('Bid ID, Customer Telegram ID, or Courier Telegram ID not found');
                                    };
                                });

                                bidCard.innerHTML += responseDetails;
                                bidCard.appendChild(lookChatButton);
                            });

                            bidsContainer.appendChild(bidCard);
                        });

                        display.appendChild(bidsContainer);
                    } else {
                        showModal('У данного заказчика ещё нет переписок');
                    };
                })
                .catch(error => {
                    console.error(`Error in showCustomerChatsWithCouriers: ${error}`);
                });
        } catch (error) {
            console.error(`Error in showCustomerChatsWithCouriers: ${error}`);
        };
    };
};


async function showSelectedCustomerChat(bidID, customerTelegramID, courierTelegramID) {
    const display = document.getElementById('display');
    display.classList.add('view-mode');

    display.innerHTML = '';
    display.innerHTML = 'Загрузка...';

    const chatHistory = document.createElement('div');
    chatHistory.classList.add('chat-history');
    chatHistory.classList.add('view-mode');

    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            const response = await fetch(
                `/delivery/get-chats?bid_id=${bidID}&customer_telegram_id=${customerTelegramID}&courier_telegram_id=${courierTelegramID}`
            );
            const data = await response.json();

            if (data.success && Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
                // Use Promise.all to resolve all async operations in the .map()
                const messagesHtml = await Promise.all(
                    data.chatMessages
                        // Filter out empty messages
                        .filter((msg) => msg.trim() !== '')
                        // Replace '\n' with <br>
                        .map(async (msg) => {
                            if (msg.includes('app/chats/attachments/')) {
                                // Extract sender, attachment path, and timestamp
                                const [senderLine, attachmentString, timestamp] = msg.split('\n').filter(line => line.trim() !== '');
                                const attachmentUrl = attachmentString.replace('app/chats/attachments/', '/attachments/');

                                const customerName = await fetch('/get-user-data', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ telegram_id: customerTelegramID })
                                })
                                    .then(response => response.json())
                                    .then(data => data.userData.name);
                                const courierName = await fetch('/get-user-data', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ telegram_id: courierTelegramID })
                                })
                                    .then(response => response.json())
                                    .then(data => data.userData.delivery_name);

                                const senderName = senderLine.includes('Заказчик')
                                    ? `Заказчик ${customerName}:`
                                    : `Курьер ${courierName}:`;

                                // Render the message with attachment
                                return `<div class="chat-message">
                                            ${senderName}<br><br>
                                            <img src="${attachmentUrl}" alt="Attachment" class="attachment-image">
                                            <br><br>
                                            ${timestamp}
                                        </div>`
                            } else {
                                return `<div class="chat-message">${msg.replace(/\n/g, '<br>')}</div>`
                            };
                        })
                );

                chatHistory.innerHTML = messagesHtml.join('');
            } else {
                showModal('Произошла ошибка при загрузке переписки, попробуйте перезайти в приложение.');
            };

            display.innerHTML = '';
            display.appendChild(chatHistory);
        } catch (error) {
            console.error(`Error in showSelectedCustomerChat: ${error}`);
        };
    };
};


async function showCourierChats(validatedTelegramID, name, socket) {
    // Fetch the list of customers who wrote to the performer
    try {
        const customers = await fetchCustomers(validatedTelegramID);

        if (customers.length === 0) {
            showModal('На Ваши отклики ещё никто не написал.');
            return;
        } else {
            // Create the chat interface
            const response = await fetch('../templates/chat_window.html');
            display.innerHTML = await response.text(); // Properly inject the fetched HTML content

            // Populate the customer buttons
            const customerList = document.getElementById('user-list');
            const chatInput = document.getElementById('chat-input');

            customers.forEach((customer) => {
                const button = document.createElement('button');
                button.innerHTML = `${customer.name}`;
                button.addEventListener('click', () => {
                    loadPerformerChatHistory(validatedTelegramID, name, customer, socket)
                    chatInput.classList.remove('hidden');
                });
                customerList.appendChild(button);
            });

            scrollInputsIntoView();
        };
    } catch (error) {
        console.error(`Error in showCourierChats: ${error}`);
    };
};


async function loadCourierChatHistory(validatedTelegramID, name, customer, socket) {
    const chatHistory = document.getElementById('chat-history');

    // Clear the chat history
    chatHistory.innerHTML = '';
    chatHistory.innerHTML = 'Загрузка...';

    try {
        // Fetch the chat history
        const response = await fetch(
            `/delivery/get-chats?bid_id=${customer.bidID}&customer_telegram_id=${customer.telegramID}&courier_telegram_id=${validatedTelegramID}`
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
            chatHistory.innerHTML = data.chatMessages
                // Filter out empty messages
                .filter((msg) => msg.trim() !== '')
                // Replace '\n' with <br>
                .map((msg) => {
                    if (msg.includes('app/chats/attachments/')) {
                        // Extract sender and timestamp
                        const [senderLine, attachmentString, timestamp] = msg.split('\n').filter(line => line.trim() !== '');
                        const attachmentUrl = attachmentString.replace('app/chats/attachments/', '/attachments/');
                        const senderName = senderLine.includes('Заказчик')
                            ? `Заказчик ${customer.name}:`
                            : `Курьер ${name}:`;

                        // Render the message with attachment
                        return `<div class="chat-message">
                                    ${senderName}<br><br>
                                    <img src="${attachmentUrl}" alt="Attachment" class="attachment-image">
                                    <br><br>
                                    ${timestamp}
                                </div>`
                    } else {
                        return `<div class="chat-message">${msg.replace(/\n/g, '<br>')}</div>`
                    };
                })
                .join('');
        } else {
            chatHistory.innerHTML = 'Нет сообщений.';
        };
    } catch (error) {
        console.error(`Error in loadChatHistory: ${error}`);
        chatHistory.innerHTML = 'Произошла ошибка при загрузке сообщений.';
    };

    // Attach event listener for sending messages
    const sendButton = document.getElementById('send-button');
    sendButton.onclick = async () => {
        const messageTextArea = document.getElementById('message-input');
        const message = messageTextArea.value.trim();

        if (message) {
            // Send the message to the server to save and to route to Telegram
            const response = await fetch('/delivery/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bid_id: customer.bidID,
                    customer_telegram_id: customer.telegramID,
                    performer_telegram_id: validatedTelegramID,
                    message,
                    sender_type: 'courier'
                })
            });
            // Send the message through the WebSocket to be displayed on the other side
            if (socket && socket.readyState === WebSocket.OPEN) {
                const messageData = {
                    recipient_telegram_id: customer.telegramID,
                    sender_name: name,
                    message,
                    attachment: null
                };
                console.log(`Message data: ${JSON.stringify(messageData)}`);

                socket.send(JSON.stringify(messageData));
            };

            if (response.ok) {
                const currentDate = new Date().toLocaleString();

                const chatHistory = document.getElementById('chat-history');

                chatHistory.innerHTML += `<div class="chat-message">
                                            Курьер ${name}:
                                            <br><br>${message}
                                            <br><br>${currentDate}
                                            </div>`;

                messageTextArea.value = '';
                const display = document.getElementById('display');
                scrollToBottom(display);
            };
        };
    };

    const attachmentInput = document.getElementById('attachment-input');
    const attachmentButton = document.getElementById('attachment-button');
    attachmentButton.onclick = () => {
        attachmentInput.click();
    };

    attachmentInput.addEventListener('change', async () => {
        const file = attachmentInput.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('attachment', file);
            formData.append('bid_id', courier.bidID);
            formData.append('customer_telegram_id', customer.telegramID);
            formData.append('courier_telegram_id', validatedTelegramID);
            formData.append('sender_type', 'performer');

            try {
                const response = await fetch('/delivery/send-message', {
                    method: 'POST',
                    body: formData
                });

                // Send the file through the WebSocket to be displayed on the other side
                const base64File = await fileToBase64(file);

                if (socket && socket.readyState === WebSocket.OPEN) {
                    const messageData = {
                        recipient_telegram_id: customer.telegramID,
                        sender_name: name,
                        message: '[File sent]',
                        attachment: base64File
                    };

                    socket.send(JSON.stringify(messageData));
                };

                if (response.ok) {
                    const currentDate = new Date().toLocaleString();
                    const chatHistory = document.getElementById('chat-history');

                    chatHistory.innerHTML += `<div class="chat-message">
                                                Курьер ${name}:
                                                <br><br><img src="${URL.createObjectURL(file)}" alt="Attachment" class="attachment-image">
                                                <br><br>${currentDate}
                                              </div>`;

                    const display = document.getElementById('display');
                    scrollToBottom(display);
                };
            } catch (error) {
                console.error(`Error in sendAttachment: ${error}`);
                showModal('Произошла ошибка при отправке файла');
            };
        };
    });
};


async function showCustomerChats(validatedTelegramID, name, socket) {
    // Fetch the list of couriers who responded to the customer's bids
    try {
        const couriers = await fetchCouriers(validatedTelegramID);

        if (couriers.length === 0) {
            showModal('На Ваши заявки ещё никто не откликался.');
            return;
        } else {
            // Create the chat interface
            const response = await fetch('../templates/chat_window.html');
            display.innerHTML = await response.text(); // Properly inject the fetched HTML content

            // Populate the courier buttons
            const courierList = document.getElementById('user-list');
            const chatInput = document.getElementById('chat-input');

            couriers.forEach((courier) => {
                const courierParagraph = document.createElement('p');
                courierParagraph.innerHTML =
                    `${courier.name}. Зарегистрирован ${courier.delivery_registration_date}. 
                    Дата рождения: ${courier.date_of_birth}. Есть машина ${courier.has_car ? 'да' : 'нет'}. 
                    Габариты машины: ${courier.car_dimensions}.`;

                const chatButton = document.createElement('button');
                chatButton.innerHTML = 'Написать курьеру 📩';
                chatButton.addEventListener('click', () => {
                    loadCustomerChatHistory(validatedTelegramID, name, courier, socket)
                    chatInput.classList.remove('hidden');
                });

                const lookCourierChatsButton = document.createElement('button');
                lookCourierChatsButton.innerHTML = 'Посмотреть переписки курьера 📤';
                lookCourierChatsButton.addEventListener('click', () => showCourierChatsWithCustomers(courier.telegramID));

                courierList.appendChild(courierParagraph);
                courierList.appendChild(chatButton);
                courierList.appendChild(lookCourierChatsButton);
            });

            scrollInputsIntoView();
        };
    } catch (error) {
        console.error(`Error in showCustomerChats: ${error}`);
    };
};


function showCourierChatsWithCustomers(courierTelegramID) {
    const display = document.getElementById('display');
    display.innerHTML = '';
    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';
            display.innerHTML = 'Загрузка...';
            fetch('/delivery/show-courier-chats-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ courier_telegram_id: courierTelegramID })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success && Array.isArray(data.bids)) {
                        display.innerHTML = '';

                        const responsesContainer = document.createElement('div');
                        responsesContainer.classList.add('bid-container');

                        data.bids.forEach(item => {
                            const bid = item.bid;

                            const responseCard = document.createElement('div');
                            responseCard.classList.add('bid-card');

                            responseCard.innerHTML = `
                        <p>Номер заказа: ${bid.id}</p>
                        <p>Город: ${bid.city}</p>
                        <p>Заказчик: ${bid.customer_name}</p>
                        <p>Что нужно доставить, описание: ${bid.description}</p>
                        <p>Откуда: ${bid.deliver_from}</p>
                        <p>Куда: ${bid.deliver_to}</p>
                        <p>Нужна машина: ${(bid.car_necessary === 1) ? 'Да' : 'Нет'}</p>
                        `;

                            const responseButton = document.createElement('button');
                            responseButton.classList.add('bid-card-button');
                            responseButton.innerHTML = 'Посмотреть переписку 👀';
                            responseButton.setAttribute('data-bid-id', bid.id);
                            responseButton.setAttribute('data-customer-telegram-id', bid.customer_telegram_id);
                            responseButton.setAttribute('data-courier-telegram-id', courierTelegramID);

                            responseButton.addEventListener('click', async (event) => {
                                const bidID = event.target.getAttribute('data-bid-id');
                                const customerTelegramID = event.target.getAttribute('data-customer-telegram-id');
                                const courierTelegramID = event.target.getAttribute('data-courier-telegram-id');

                                if (bidID && customerTelegramID && courierTelegramID) {
                                    await showSelectedCourierChat(bidID, customerTelegramID, courierTelegramID);
                                } else {
                                    showModal('Произошла ошибка при загрузке переписки, попробойте перезайти в приложение.');
                                    console.error('Invalid bid ID, customer Telegram ID, or courier Telegram ID');
                                }
                            });

                            responseCard.appendChild(responseButton);
                            responsesContainer.appendChild(responseCard);
                        });

                        display.appendChild(responsesContainer);
                    } else {
                        showModal('У данного курьера ещё нет переписок');
                    };
                })
                .catch(error => {
                    console.error(`Error in showCourierChatsWithCustomers: ${error}`);
                    showModal('Произошла ошибка при загрузке списка заказов, попробуйте перезайти в приложение');
                });
        } catch (error) {
            showModal('Произошла ошибка при загрузке списка заказов, попробуйте перезайти в приложение');
            console.error(`Error in showCourierChatsWithCustomers: ${error}`);
        };
    };
};


async function showSelectedCourierChat(bidID, customerTelegramID, courierTelegramID) {
    const display = document.getElementById('display');
    display.classList.add('view-mode');

    display.innerHTML = '';
    display.innerHTML = 'Загрузка...';

    const chatHistory = document.createElement('div');
    chatHistory.classList.add('chat-history');
    chatHistory.classList.add('view-mode');

    if (!display) {
        console.error('Display element not found');
        return;
    } else {
        try {
            display.innerHTML = '';
            display.innerHTML = 'Загрузка...';

            const response = await fetch(
                `/delivery/get-chats?bid_id=${bidID}&customer_telegram_id=${customerTelegramID}&courier_telegram_id=${courierTelegramID}`
            );
            const data = await response.json();

            if (data.success && Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
                // Use Promise.all to resolve all async operations in the .map()
                const messagesHtml = await Promise.all(
                    data.chatMessages
                        // Filter out empty messages
                        .filter((msg) => msg.trim() !== '')
                        // Replace '\n' with <br>
                        .map(async (msg) => {
                            if (msg.includes('app/chats/attachments/')) {
                                // Extract sender, attachment path, and timestamp
                                const [senderLine, attachmentString, timestamp] = msg.split('\n').filter(line => line.trim() !== '');
                                const attachmentUrl = attachmentString.replace('app/chats/attachments/', '/attachments/');
                                console.log(attachmentUrl);

                                const customerName = await fetch('/get-user-data', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ telegram_id: customerTelegramID })
                                })
                                    .then(response => response.json())
                                    .then(data => data.userData.delivery_name);
                                const courierName = await fetch('/get-user-data', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ telegram_id: courierTelegramID })
                                })
                                    .then(response => response.json())
                                    .then(data => data.userData.delivery_name);

                                const senderName = senderLine.includes('Заказчик')
                                    ? `Заказчик ${customerName}:`
                                    : `Курьер ${courierName}:`;

                                // Render the message with attachment
                                return `<div class="chat-message">
                                            ${senderName}<br><br>
                                            <img src="${attachmentUrl}" alt="Attachment" class="attachment-image">
                                            <br><br>
                                            ${timestamp}
                                        </div>`
                            } else {
                                return `<div class="chat-message">${msg.replace(/\n/g, '<br>')}</div>`
                            };
                        })
                );

                chatHistory.innerHTML = messagesHtml.join('');
            } else {
                showModal('Произошла ошибка при загрузке переписки, попробуйте перезайти в приложение.');
            };

            display.innerHTML = '';
            display.appendChild(chatHistory);
        } catch (error) {
            showModal('Произошла ошибка при загрузке переписки, попробуйте перезайти в приложение.');
            console.error(`Error in showSelectedCourierChat: ${error}`);
        };
    };
};


async function loadCustomerChatHistory(validatedTelegramID, name, courier, socket) {
    const chatHistory = document.getElementById('chat-history');

    // Clear the chat history
    chatHistory.innerHTML = '';
    chatHistory.innerHTML = 'Загрузка...';

    try {
        // Fetch the chat history
        const response = await fetch(
            `/delivery/get-chats?bid_id=${courier.bidID}&customer_telegram_id=${validatedTelegramID}&courier_telegram_id=${courier.telegramID}`
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
            chatHistory.innerHTML = data.chatMessages
                // Filter out empty messages
                .filter((msg) => msg.trim() !== '')
                // Replace '\n' with <br>
                .map((msg) => {
                    if (msg.includes('app/chats/attachments/')) {
                        // Extract sender, attachment path, and timestamp
                        const [senderLine, attachmentString, timestamp] = msg.split('\n').filter(line => line.trim() !== '');
                        const attachmentUrl = attachmentString.replace('app/chats/attachments/', '/attachments/');
                        console.log(attachmentUrl);
                        const senderName = senderLine.includes('Заказчик')
                            ? `Заказчик ${name}:`
                            : `Курьер ${courier.name}:`;

                        // Render the message with attachment
                        return `<div class="chat-message">
                                    ${senderName}<br><br>
                                    <img src="${attachmentUrl}" alt="Attachment" class="attachment-image">
                                    <br><br>
                                    ${timestamp}
                                </div>`
                    } else {
                        return `<div class="chat-message">${msg.replace(/\n/g, '<br>')}</div>`
                    };
                })
                .join('');
        } else {
            chatHistory.innerHTML = 'Нет сообщений.';
        };
    } catch (error) {
        console.error(`Error in loadCustomerChatHistory: ${error}`);
        chatHistory.innerHTML = 'Произошла ошибка при загрузке сообщений.';
    };

    // Attach event listener for sending messages
    const sendButton = document.getElementById('send-button');
    sendButton.onclick = async () => {
        const messageTextArea = document.getElementById('message-input');
        const message = messageTextArea.value.trim();

        if (message) {
            // Send the message to the server to save and to route to Telegram
            const response = await fetch('/delivery/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bid_id: performer.bidID,
                    customer_telegram_id: validatedTelegramID,
                    courier_telegram_id: courier.telegramID,
                    message,
                    sender_type: 'customer'
                })
            });

            // Send the message through the WebSocket to be displayed on the other side
            if (socket && socket.readyState === WebSocket.OPEN) {
                const messageData = {
                    recipient_telegram_id: courier.telegramID,
                    sender_name: name,
                    message,
                    attachment: null
                };

                socket.send(JSON.stringify(messageData));
            };

            if (response.ok) {
                const currentDate = new Date().toLocaleString();

                const chatHistory = document.getElementById('chat-history');
                chatHistory.innerHTML += `<div class="chat-message">
                                            Заказчик ${name}:
                                            <br><br>${message}
                                            <br><br>${currentDate}
                                          </div>`;

                messageTextArea.value = '';
                const display = document.getElementById('display');
                scrollToBottom(display);
            };
        };
    };

    const attachmentInput = document.getElementById('attachment-input');
    const attachmentButton = document.getElementById('attachment-button');
    attachmentButton.onclick = () => {
        attachmentInput.click();
    };

    attachmentInput.addEventListener('change', async () => {
        const file = attachmentInput.files[0];

        if (file) {
            const formData = new FormData();
            formData.append('attachment', file);
            formData.append('bid_id', courier.bidID);
            formData.append('customer_telegram_id', validatedTelegramID);
            formData.append('courier_telegram_id', courier.telegramID);
            formData.append('sender_type', 'customer');

            try {
                const response = await fetch('/delivery/send-message', {
                    method: 'POST',
                    body: formData
                });

                // Send the file through the WebSocket to be displayed on the other side
                const base64File = await fileToBase64(file);

                if (socket && socket.readyState === WebSocket.OPEN) {
                    const messageData = {
                        recipient_telegram_id: courier.telegramID,
                        sender_name: name,
                        message: '[File sent]',
                        attachment: base64File
                    };
                    
                    socket.send(JSON.stringify(messageData));
                };

                if (response.ok) {
                    const currentDate = new Date().toLocaleString();
                    const chatHistory = document.getElementById('chat-history');

                    chatHistory.innerHTML += `<div class="chat-message">
                                                Заказчик ${name}:
                                                <br><br><img src="${URL.createObjectURL(file)}" alt="Attachment" class="attachment-image">
                                                <br><br>${currentDate}
                                              </div>`;

                    const display = document.getElementById('display');
                    scrollToBottom(display);
                };
            } catch (error) {
                console.error(`Error in sendAttachment: ${error}`);
                showModal('Произошла ошибка при отправке файла');
            };
        };
    });
};