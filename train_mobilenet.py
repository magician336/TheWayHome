import torch
import torch.nn as nn
import torch.optim as optim
import copy
import os
import matplotlib.pyplot as plt
from tqdm.auto import tqdm
from torchvision.datasets import ImageFolder
import torchvision.transforms as T
from torch.utils.data import DataLoader
from torch_py.MobileNetV1 import MobileNetV1


def processing_data(data_path, height=224, width=224, batch_size=32, test_split=0.1):
    """
    数据处理：加载目录型图像数据，进行基本变换并划分训练/验证集
    返回 DataLoader(train), DataLoader(valid)
    """
    transforms = T.Compose([
        T.Resize((height, width)),
        T.RandomHorizontalFlip(0.1),
        T.RandomVerticalFlip(0.1),
        T.ToTensor(),
        T.Normalize([0], [1]),
    ])

    dataset = ImageFolder(data_path, transform=transforms)
    train_size = int((1 - test_split) * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = torch.utils.data.random_split(dataset, [train_size, test_size])

    train_data_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    valid_data_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=True)

    return train_data_loader, valid_data_loader


DEVICE = torch.device("cuda:0") if torch.cuda.is_available() else torch.device("cpu")
LEARNING_RATE = 1e-3
EPOCHS = 35
BATCH_SIZE = 32
IMG_SIZE = 160
DATA_PATH = "./datasets/5f680a696ec9b83bb0037081-momodel/data/image"
SAVE_PATH = './results/best_model.pth'

if not os.path.exists('./results'):
    os.makedirs('./results')

print(f"正在加载数据... 设备: {DEVICE}")
train_loader, valid_loader = processing_data(
    data_path=DATA_PATH,
    height=IMG_SIZE,
    width=IMG_SIZE,
    batch_size=BATCH_SIZE
)

model = MobileNetV1(classes=2).to(DEVICE)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, 'max', factor=0.2, patience=5, verbose=True
)


def train_model(model, train_loader, valid_loader, criterion, optimizer, num_epochs=10):
    best_acc = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())
    history = {'train_loss': [], 'valid_loss': [], 'valid_acc': []}

    for epoch in range(num_epochs):
        print(f'Epoch {epoch + 1}/{num_epochs}')
        print('-' * 10)

        model.train()
        running_loss = 0.0

        for x, y in tqdm(train_loader, desc="Training"):
            x = x.to(DEVICE)
            y = y.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(x)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * x.size(0)

        epoch_loss = running_loss / len(train_loader.dataset)
        history['train_loss'].append(epoch_loss)

        model.eval()
        val_loss = 0.0
        val_corrects = 0

        with torch.no_grad():
            for x, y in valid_loader:
                x = x.to(DEVICE)
                y = y.to(DEVICE)

                outputs = model(x)
                loss = criterion(outputs, y)
                _, preds = torch.max(outputs, 1)

                val_loss += loss.item() * x.size(0)
                val_corrects += torch.sum(preds == y.data)

        val_loss = val_loss / len(valid_loader.dataset)
        val_acc = val_corrects.double() / len(valid_loader.dataset)

        history['valid_loss'].append(val_loss)
        history['valid_acc'].append(val_acc.item())

        print(f'Train Loss: {epoch_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}')

        scheduler.step(val_acc)

        if val_acc > best_acc:
            best_acc = val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            torch.save(model.state_dict(), SAVE_PATH)
            print(f"--> 发现更优模型，已保存至 {SAVE_PATH}")

    print(f'训练完成。最佳验证集准确率: {best_acc:.4f}')
    model.load_state_dict(best_model_wts)
    return model, history


trained_model, history = train_model(model, train_loader, valid_loader, criterion, optimizer, EPOCHS)

# 训练结果
plt.figure(figsize=(12, 4))
plt.subplot(1, 2, 1)
plt.plot(history['train_loss'], label='Train Loss')
plt.plot(history['valid_loss'], label='Valid Loss')
plt.title('Loss History')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history['valid_acc'], label='Valid Accuracy', color='orange')
plt.title('Validation Accuracy History')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()

plt.show()
